import { animate, utils } from 'animejs';

// Lattice size in world units. Generous enough to overflow any section box, so
// the grid never shows an edge whatever the viewport is doing.
const FIELD_W = 15;
const FIELD_H = 9;
const SPACING = 0.15;

const FOV = 50;
const CAMERA_Z = 5;

const VERTEX = /* glsl */ `
  uniform float uTime;
  uniform vec2 uPointer;
  uniform float uPointerOn;
  uniform float uBurst;
  uniform float uBurstDir;
  uniform float uSize;

  varying float vAmp;

  void main() {
    vec2 p = position.xy;

    // Idle swell: two slow waves crossed, so the lattice breathes even when
    // nobody is touching it.
    float idle = sin(p.x * 0.7 + uTime * 0.5) * cos(p.y * 0.62 - uTime * 0.42) * 0.16;

    // Pointer ripple, falling off with distance so only the neighbourhood of
    // the cursor lifts.
    float dp = length(p - uPointer);
    float ripple = sin(dp * 4.0 - uTime * 2.2) * exp(-dp * 0.6) * uPointerOn * 0.4;

    // Switch burst: a ring expanding from the side the new project came from.
    // uBurst runs 0 -> 1 once per switch; the ring fades as it widens.
    vec2 origin = vec2(uBurstDir * 3.2, 0.0);
    float radius = uBurst * 9.0;
    float edge = length(p - origin) - radius;
    float ring = exp(-edge * edge * 3.0) * (1.0 - uBurst) * 1.15;

    float amp = idle + ripple + ring;
    vAmp = amp;

    vec4 mv = modelViewMatrix * vec4(p.x, p.y, amp * 1.1, 1.0);
    // Perspective attenuation: far dots stay small, near ones grow with the wave.
    gl_PointSize = uSize * (1.0 + amp * 2.2) / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAGMENT = /* glsl */ `
  precision mediump float;

  uniform vec3 uBase;
  uniform vec3 uHot;
  uniform float uOpacity;

  varying float vAmp;

  void main() {
    // Round the square point sprite off, and drop the corners entirely.
    float d = length(gl_PointCoord - 0.5);
    float mask = smoothstep(0.5, 0.18, d);
    if (mask <= 0.001) discard;

    float heat = clamp(vAmp * 1.6, 0.0, 1.0);
    vec3 colour = mix(uBase, uHot, heat);
    gl_FragColor = vec4(colour, mask * uOpacity * (0.35 + heat * 0.9));
  }
`;

function buildGrid(THREE) {
  const cols = Math.round(FIELD_W / SPACING);
  const rows = Math.round(FIELD_H / SPACING);
  const positions = new Float32Array(cols * rows * 3);

  let i = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      positions[i] = -FIELD_W / 2 + col * SPACING;
      positions[i + 1] = -FIELD_H / 2 + row * SPACING;
      positions[i + 2] = 0;
      i += 3;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return geometry;
}

/**
 * Ambient lattice behind the Projects section.
 *
 * A grid of points that breathes on its own, ripples under the pointer, and
 * fires a ring outward from the side a new project entered from — so switching
 * project is felt in the whole section, not just inside the video frame.
 *
 * three.js draws; anime.js owns the burst, exactly as in the skills
 * constellation and the certificates deck. The render loop only runs while the
 * section is on screen and the tab is visible, so an off-screen section costs
 * nothing.
 */
export async function createField({ canvas }) {
  const THREE = await import('three');

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearAlpha(0);

  const uniforms = {
    uTime: { value: 0 },
    uPointer: { value: new THREE.Vector2(0, 0) },
    uPointerOn: { value: 0 },
    uBurst: { value: 1 }, // 1 = spent, so nothing fires before the first switch
    uBurstDir: { value: 1 },
    uSize: { value: 9 },
    uBase: { value: new THREE.Color('#1f3358') },
    uHot: { value: new THREE.Color('#60a5fa') },
    uOpacity: { value: 0.9 },
  };

  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(buildGrid(THREE), material);
  points.frustumCulled = false;

  const scene = new THREE.Scene();
  scene.add(points);

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 50);
  camera.position.z = CAMERA_Z;

  // World units visible at z = 0, used to map pointer pixels onto the lattice.
  let viewH = 1;
  let viewW = 1;

  const resize = () => {
    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);

    viewH = 2 * Math.tan(THREE.MathUtils.degToRad(FOV) / 2) * CAMERA_Z;
    viewW = viewH * camera.aspect;
    // Keep dots the same apparent size whatever the box is; the constant is
    // just what looked right at a 1440px-wide section.
    uniforms.uSize.value = (height / 1000) * 26 + 5;
  };
  window.addEventListener('resize', resize);
  resize();

  let presence = null;

  // The ripple fades in and out rather than snapping. A cross-origin iframe
  // swallows pointer events, so hovering the video reads as the pointer having
  // left the section: without the fade the ripple would blink off and back on
  // every time the pointer crossed the player's edge.
  const setPresence = (to) => {
    if (uniforms.uPointerOn.value === to) return;
    presence?.pause();
    presence = animate(uniforms.uPointerOn, {
      value: to,
      duration: to ? 260 : 520,
      ease: 'out(2)',
    });
  };

  /** Pointer in 0..1 section coordinates, or null when it has left. */
  const setPointer = (nx, ny) => {
    if (nx === null) {
      setPresence(0);
      return;
    }
    // The position keeps updating while the ripple is fading out, so a pointer
    // that comes back somewhere else does not drag the wave across the field.
    uniforms.uPointer.value.set((nx - 0.5) * viewW, (0.5 - ny) * viewH);
    setPresence(1);
  };

  let disposed = false;
  let contextLost = false;
  let wanted = false;
  let frame = 0;
  let running = false;
  let last = 0;
  let burst = null;

  const loop = (now) => {
    if (disposed) return;
    frame = requestAnimationFrame(loop);
    // Clamped so a backgrounded tab doesn't resume with one enormous step.
    const delta = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
    last = now;
    uniforms.uTime.value += delta;
    renderer.render(scene, camera);
  };

  const start = () => {
    if (running || disposed) return;
    running = true;
    last = 0;
    frame = requestAnimationFrame(loop);
  };
  const stop = () => {
    running = false;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  };

  /** Play/pause with the section's visibility. */
  const setActive = (active) => {
    wanted = active;
    if (active && !contextLost) start();
    else stop();
  };

  // The browser can take the GL context back at any time — a long spell in a
  // background tab, the GPU process recycling. three.js rebuilds its own state
  // on restore; this puts the loop back, and keeps it stopped in between so it
  // is not spinning against a dead context.
  const handleLost = (event) => {
    event.preventDefault();
    contextLost = true;
    stop();
  };

  const handleRestored = () => {
    if (disposed) return;
    contextLost = false;
    resize();
    if (wanted) start();
  };

  canvas.addEventListener('webglcontextlost', handleLost);
  canvas.addEventListener('webglcontextrestored', handleRestored);

  /** Ring outward from the side the incoming project came from. */
  const pulse = (dir = 1) => {
    if (disposed) return;
    burst?.pause();
    uniforms.uBurstDir.value = dir >= 0 ? -1 : 1;
    uniforms.uBurst.value = 0;
    burst = animate(uniforms.uBurst, {
      value: [0, 1],
      duration: 1100,
      ease: 'out(2)',
    });
  };

  const fadeIn = () =>
    animate(uniforms.uOpacity, { value: [0, 0.9], duration: 1200, ease: 'out(2)' });

  const dispose = () => {
    disposed = true;
    stop();
    canvas.removeEventListener('webglcontextlost', handleLost);
    canvas.removeEventListener('webglcontextrestored', handleRestored);
    burst?.pause();
    presence?.pause();
    window.removeEventListener('resize', resize);
    utils.remove(uniforms.uBurst);
    utils.remove(uniforms.uOpacity);
    utils.remove(uniforms.uPointerOn);
    points.geometry.dispose();
    material.dispose();
    renderer.dispose();
  };

  return { setPointer, setActive, pulse, fadeIn, resize, dispose };
}
