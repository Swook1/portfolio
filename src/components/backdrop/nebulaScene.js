import { createAnimatable, utils } from 'animejs';
import { auroraFragment, AURORA_VERTEX } from './auroraScene';
import { createStarField } from './spaceScene';
import { wrapDepth } from './depth';

const FIELD = { x: 26, y: 18, z: 60 };

/**
 * The two quality profiles.
 *
 * `lite` is what a phone gets. Every value in it is a fill-rate or bandwidth
 * decision rather than a visual one: the aurora is fragment bound, so the
 * drawing buffer and the octave count dominate its cost, and the stars are
 * bound by the per-frame CPU walk over their positions.
 *
 * The result is the same backdrop, not a different one — same aurora, same
 * field, same drift. It is drawn smaller, softer and less often.
 */
const PROFILES = {
  high: {
    frameMs: 1000 / 30, // the backdrop never needs more than 30fps
    starCount: 700,
    // Above ~1.5 the aurora costs real time for detail nobody can see in a
    // soft gradient.
    pixelRatio: () => Math.min(window.devicePixelRatio, 1.5),
    octaves: 3,
    powerPreference: 'default',
  },
  lite: {
    frameMs: 1000 / 24,
    starCount: 240,
    // Under 1: the buffer is smaller than the CSS box and the browser scales
    // it up. A phone's DPR is 3 or 4, so honouring it would mean shading ten
    // times the pixels a laptop does on a fraction of the GPU. The aurora is
    // a slow gradient and the stars bloom anyway, so neither shows the seams.
    pixelRatio: () => Math.min(window.devicePixelRatio, 1) * 0.75,
    octaves: 2,
    powerPreference: 'low-power',
  },
};

// Idle drift. Slow enough to read as a sky rather than as an animation: the
// roll takes about twenty minutes to come round, and the cruise crosses the
// field's depth in something over three minutes.
const ROLL = 0.005; // radians per second about the view axis
const CRUISE = 0.3; // world units per second, towards the camera
const SWAY_X = 0.9;
const SWAY_Y = 0.6;

/**
 * Aurora and star field in one backdrop.
 *
 * Two passes through a single renderer and canvas: the aurora is a clip-space
 * quad with no camera transform, so it cannot share a scene graph with stars
 * that need perspective. It draws first, then `autoClear` is turned off and the
 * stars are drawn over it — which is also what gives the depth, since the
 * aurora reads as the sky behind them.
 *
 * anime.js damps every input: scroll drifts the aurora and flies the camera
 * through the field, the pointer tilts both.
 */
export async function createNebula({ canvas, onLost, onRestored, quality = 'high' }) {
  const THREE = await import('three');

  const profile = PROFILES[quality] || PROFILES.high;
  const { frameMs: FRAME_MS, starCount: STAR_COUNT } = profile;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    powerPreference: profile.powerPreference,
  });
  renderer.setPixelRatio(profile.pixelRatio());

  // --- Pass 1: aurora -------------------------------------------------------
  const auroraScene = new THREE.Scene();
  const auroraCamera = new THREE.Camera();

  const uniforms = {
    uTime: { value: 0 },
    uScroll: { value: 0 },
    uPointer: { value: new THREE.Vector2(0, 0) },
    uAspect: { value: 1 },
    uVelocity: { value: 0 },
  };

  const auroraMaterial = new THREE.ShaderMaterial({
    vertexShader: AURORA_VERTEX,
    fragmentShader: auroraFragment({ octaves: profile.octaves }),
    uniforms,
    transparent: true,
    depthWrite: false,
    depthTest: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), auroraMaterial);
  quad.frustumCulled = false;
  auroraScene.add(quad);

  // --- Pass 2: stars --------------------------------------------------------
  const starScene = new THREE.Scene();
  const starCamera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
  starCamera.position.set(0, 0, 0);

  const { points: stars, geometry: starGeometry, material: starMaterial } = createStarField(
    THREE,
    { count: STAR_COUNT, field: FIELD }
  );
  starScene.add(stars);

  // --- Scroll + pointer, damped by anime.js ---------------------------------
  const auroraDrift = createAnimatable(uniforms.uScroll, { value: 1200, ease: 'out(3)' });
  const auroraPointer = createAnimatable(uniforms.uPointer.value, {
    x: 900,
    y: 900,
    ease: 'out(3)',
  });
  const flight = createAnimatable(starCamera.position, { z: 900, x: 700, y: 700, ease: 'out(3)' });
  const tilt = createAnimatable(starCamera.rotation, { x: 900, y: 900, ease: 'out(3)' });

  const onScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? utils.clamp(window.scrollY / max, 0, 1) : 0;
    auroraDrift.value(progress * 2.4);
    flight.z(-progress * (FIELD.z - 14));
  };

  const onPointerMove = (event) => {
    const px = (event.clientX / window.innerWidth - 0.5) * 2;
    const py = (event.clientY / window.innerHeight - 0.5) * 2;
    auroraPointer.x(px);
    auroraPointer.y(py);
    flight.x(px * 1.4);
    flight.y(-py * 1.0);
    tilt.y(-px * 0.04);
    tilt.x(py * 0.03);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  // A touch device has no hovering pointer: every `pointermove` there is part
  // of a scroll gesture the scroll handler already sees, so listening would
  // only add work on the frames that can least afford it.
  const tracksPointer = window.matchMedia('(hover: hover)').matches;
  if (tracksPointer) window.addEventListener('pointermove', onPointerMove, { passive: true });
  onScroll();

  // --- Sizing ---------------------------------------------------------------
  // Mobile browsers fire `resize` every time the URL bar slides away, which is
  // to say on most scrolls. Reallocating the drawing buffer that often is both
  // expensive and visible as a flicker, so a height-only change smaller than
  // the bar is ignored and the canvas keeps its slightly-off aspect — which on
  // a slow gradient and a point field is not something you can see.
  const URL_BAR_SLACK = 150;
  let lastWidth = 0;
  let lastHeight = 0;

  const resize = (force = false) => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (
      !force &&
      width === lastWidth &&
      Math.abs(height - lastHeight) < URL_BAR_SLACK
    ) {
      return;
    }
    lastWidth = width;
    lastHeight = height;

    uniforms.uAspect.value = width / height;
    starCamera.aspect = width / height;
    starCamera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };
  const onResize = () => resize();
  window.addEventListener('resize', onResize);
  resize(true);

  // --- Frame loop -----------------------------------------------------------
  let frame = 0;
  let disposed = false;
  let lastFrame = 0;

  const starPositions = starGeometry.attributes.position;
  const STAR_SIZE = starMaterial.size;

  // The field's own motion, independent of scroll and pointer. It is applied to
  // the star object rather than the camera because the camera's position is
  // owned by the anime.js animatables above, and two writers on one property
  // means whichever runs last wins.
  let elapsed = 0;
  let lastNow = 0;
  let cruise = 0;

  // How hard the page is being thrown, 0-1. Attack is fast and release slow, so
  // a flick blocks the aurora up immediately and it resolves over the next
  // second or so rather than snapping back the moment the wheel stops.
  let lastScrollY = window.scrollY;
  let velocity = 0;

  const trackVelocity = () => {
    const y = window.scrollY;
    // Capped below 1: a hard flick should break the field up, not bury the
    // copy sitting on top of it.
    const target = Math.min(Math.abs(y - lastScrollY) / 110, 0.82);
    lastScrollY = y;
    velocity += (target - velocity) * (target > velocity ? 0.5 : 0.06);
    uniforms.uVelocity.value = velocity;
    // Stars bloom with the speed, which reads as motion blur without needing a
    // second pass to smear them.
    starMaterial.size = STAR_SIZE * (1 + velocity * 2.4);
    starMaterial.opacity = 0.62 - velocity * 0.22;
  };

  const drift = (now) => {
    // Clamped: a backgrounded tab resumes with a huge gap, and an unclamped
    // step would jump the sky across in one frame.
    const delta = lastNow ? Math.min((now - lastNow) / 1000, 0.1) : 0;
    lastNow = now;
    elapsed += delta;
    cruise += CRUISE * delta;

    // The cruise runs forever, and a star's world z is `local z + cruise`. Left
    // unbounded the two grow into each other's float32 precision and the sky
    // starts to shimmer after a few hours on screen. Rebasing both by one field
    // depth leaves every world position bit-for-bit where it was.
    if (cruise > FIELD.z) {
      cruise -= FIELD.z;
      const array = starPositions.array;
      for (let i = 0; i < STAR_COUNT; i += 1) array[i * 3 + 2] += FIELD.z;
      starPositions.needsUpdate = true;
    }

    // Roll is about the view axis, so it turns x into y and never into z — the
    // depth wrap below still compares like with like.
    stars.rotation.z = elapsed * ROLL;
    stars.position.z = cruise;
    stars.position.x = Math.sin(elapsed * 0.05) * SWAY_X;
    stars.position.y = Math.cos(elapsed * 0.037) * SWAY_Y;
  };

  const recycleStars = () => {
    const array = starPositions.array;
    // Star coordinates are local to the field, so the camera has to be brought
    // into the same space before the two can be compared.
    const cameraZ = starCamera.position.z - stars.position.z;
    let moved = false;

    for (let i = 0; i < STAR_COUNT; i += 1) {
      const zi = i * 3 + 2;
      const wrapped = wrapDepth(array[zi], cameraZ, FIELD.z);
      if (wrapped !== array[zi]) {
        array[zi] = wrapped;
        // Re-scatter across the frame as well, so it doesn't read as the same
        // star sliding back into place.
        array[i * 3] = (Math.random() - 0.5) * FIELD.x * 2;
        array[i * 3 + 1] = (Math.random() - 0.5) * FIELD.y * 2;
        moved = true;
      }
    }
    if (moved) starPositions.needsUpdate = true;
  };

  const draw = (now) => {
    uniforms.uTime.value = now * 0.001;
    trackVelocity();
    drift(now);
    // Only ever rolled about the view axis: the wrap compares star z against
    // the camera, and turning the field on any other axis would mix x into z
    // and break that.
    recycleStars();

    renderer.autoClear = true;
    renderer.render(auroraScene, auroraCamera);
    renderer.autoClear = false;
    renderer.render(starScene, starCamera);
  };

  const render = (now) => {
    if (disposed) return;
    frame = requestAnimationFrame(render);
    if (document.hidden || now - lastFrame < FRAME_MS) return;
    lastFrame = now;
    draw(now);
  };
  // Paint once immediately so the canvas is never blank while waiting for the
  // first animation frame.
  draw(0);
  frame = requestAnimationFrame(render);

  // A lost context wipes the drawing buffer, and the browser takes one whenever
  // it wants: a long spell in a background tab, the GPU process recycling, a
  // driver reset. three.js rebuilds its own state on restore, but nothing was
  // telling the page — so the backdrop went blank and stayed blank, with the
  // CSS tier still stepped aside for a canvas that had stopped painting.
  const handleLost = (event) => {
    event.preventDefault();
    cancelAnimationFrame(frame);
    frame = 0;
    onLost?.();
  };

  const handleRestored = () => {
    if (disposed) return;
    // three.js has already rebuilt the GL context by now; this only has to put
    // the loop and the frame clock back. Forced: the new buffer has no size of
    // its own yet, so the guard above must not short-circuit it.
    resize(true);
    lastFrame = 0;
    lastNow = 0;
    draw(performance.now());
    frame = requestAnimationFrame(render);
    onRestored?.();
  };

  canvas.addEventListener('webglcontextlost', handleLost);
  canvas.addEventListener('webglcontextrestored', handleRestored);

  const dispose = () => {
    disposed = true;
    cancelAnimationFrame(frame);
    canvas.removeEventListener('webglcontextlost', handleLost);
    canvas.removeEventListener('webglcontextrestored', handleRestored);
    window.removeEventListener('scroll', onScroll);
    if (tracksPointer) window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('resize', onResize);
    auroraDrift.revert();
    auroraPointer.revert();
    flight.revert();
    tilt.revert();
    quad.geometry.dispose();
    auroraMaterial.dispose();
    starGeometry.dispose();
    starMaterial.dispose();
    renderer.dispose();
  };

  return { dispose };
}
