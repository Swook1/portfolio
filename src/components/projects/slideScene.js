import { animate } from 'animejs';

// Tile grid. Enough pieces to read as a shatter, few enough that the geometry
// is trivial (COLS * ROWS * 4 vertices).
const COLS = 9;
const ROWS = 5;
const MOBILE_COLS = 5;
const MOBILE_ROWS = 3;

const PLANE_H = 1;
const PLANE_W = 16 / 9;
const FOV = 45;

const DURATION = 900;

/**
 * YouTube's hqdefault is 480x360: a 16:9 frame letterboxed with black bars.
 * The picture itself is the middle 480x270, so v is remapped into that band
 * rather than sampling the bars.
 */
const CROP = [270 / 360, 45 / 360];

const VERTEX = /* glsl */ `
  attribute vec2 aCenter;
  attribute vec2 aCell;

  uniform float uProgress;
  uniform float uStagger;
  uniform float uDepth;
  uniform float uDir;

  varying vec2 vUv;
  varying float vFlip;
  varying float vTint;

  const float PI = 3.14159265;

  void main() {
    // Columns lead in the direction of travel, rows add a small ripple so the
    // grid never lands as one flat line.
    float col = uDir > 0.0 ? aCell.x : 1.0 - aCell.x;
    float delay = col * 0.85 + aCell.y * 0.15;

    float span = 1.0 - uStagger;
    float p = clamp((uProgress - delay * uStagger) / span, 0.0, 1.0);
    p = p * p * (3.0 - 2.0 * p);

    vFlip = step(0.5, p);
    // Peaks while the tile is edge-on, so the accent tint tracks the flip
    // without needing a second animation to stay in sync with it.
    vTint = sin(p * PI);

    float angle = p * PI * uDir;
    float c = cos(angle);
    float s = sin(angle);

    // position holds the vertex offset from its own tile centre, so each tile
    // spins about its own axis instead of the whole plane turning.
    vec3 spun = vec3(position.x * c, position.y, -position.x * s);
    vec3 world = vec3(
      aCenter.x + spun.x,
      aCenter.y + spun.y,
      spun.z + sin(p * PI) * uDepth
    );

    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(world, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  precision highp float;

  uniform sampler2D uFrom;
  uniform sampler2D uTo;
  uniform vec2 uCrop;

  varying vec2 vUv;
  varying float vFlip;
  varying float vTint;

  void main() {
    vec2 uv = vUv;
    // Past the halfway point the tile has turned its back to the camera, which
    // mirrors it in x; sampling mirrored puts the incoming frame the right way
    // round again.
    if (vFlip > 0.5) uv.x = 1.0 - uv.x;
    uv.y = uv.y * uCrop.x + uCrop.y;

    vec4 colour = vFlip > 0.5 ? texture2D(uTo, uv) : texture2D(uFrom, uv);

    // Edge-on tiles catch a little of the site's accent blue, so the flip reads
    // as lit rather than as a flat swap.
    colour.rgb = mix(colour.rgb, colour.rgb * vec3(0.55, 0.75, 1.35), vTint * 0.85);
    gl_FragColor = colour;
  }
`;

/** Grid of independent quads, each vertex stored relative to its tile centre. */
function buildGeometry(THREE, cols, rows) {
  const tiles = cols * rows;
  const positions = new Float32Array(tiles * 4 * 3);
  const uvs = new Float32Array(tiles * 4 * 2);
  const centers = new Float32Array(tiles * 4 * 2);
  const cells = new Float32Array(tiles * 4 * 2);
  const indices = new Uint16Array(tiles * 6);

  const tileW = PLANE_W / cols;
  const tileH = PLANE_H / rows;
  const halfW = tileW / 2;
  const halfH = tileH / 2;

  let t = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const cx = -PLANE_W / 2 + tileW * (col + 0.5);
      const cy = -PLANE_H / 2 + tileH * (row + 0.5);
      const u0 = col / cols;
      const u1 = (col + 1) / cols;
      const v0 = row / rows;
      const v1 = (row + 1) / rows;

      const corners = [
        [-halfW, -halfH, u0, v0],
        [halfW, -halfH, u1, v0],
        [halfW, halfH, u1, v1],
        [-halfW, halfH, u0, v1],
      ];

      corners.forEach(([x, y, u, v], k) => {
        const vi = t * 4 + k;
        positions[vi * 3] = x;
        positions[vi * 3 + 1] = y;
        positions[vi * 3 + 2] = 0;
        uvs[vi * 2] = u;
        uvs[vi * 2 + 1] = v;
        centers[vi * 2] = cx;
        centers[vi * 2 + 1] = cy;
        cells[vi * 2] = cols > 1 ? col / (cols - 1) : 0;
        cells[vi * 2 + 1] = rows > 1 ? row / (rows - 1) : 0;
      });

      const base = t * 4;
      const io = t * 6;
      indices[io] = base;
      indices[io + 1] = base + 1;
      indices[io + 2] = base + 2;
      indices[io + 3] = base;
      indices[io + 4] = base + 2;
      indices[io + 5] = base + 3;

      t += 1;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setAttribute('aCenter', new THREE.BufferAttribute(centers, 2));
  geometry.setAttribute('aCell', new THREE.BufferAttribute(cells, 2));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  return geometry;
}

/**
 * Per-slide transition for the Projects stage.
 *
 * The outgoing poster is cut into a grid of tiles; each one spins about its own
 * vertical axis, showing the incoming poster once it is past edge-on, with the
 * columns staggered in the direction of travel. Nothing renders between
 * transitions — the render loop only runs while `play` is in flight — so the
 * canvas costs nothing while the visitor is just watching a video.
 */
export async function createSlideTransition({ canvas }) {
  const THREE = await import('three');

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearAlpha(0);

  const small = window.matchMedia('(max-width: 640px)').matches;
  const geometry = buildGeometry(
    THREE,
    small ? MOBILE_COLS : COLS,
    small ? MOBILE_ROWS : ROWS
  );

  const uniforms = {
    uProgress: { value: 0 },
    uStagger: { value: 0.45 },
    uDepth: { value: 0.28 },
    uDir: { value: 1 },
    uCrop: { value: new THREE.Vector2(CROP[0], CROP[1]) },
    uFrom: { value: null },
    uTo: { value: null },
  };

  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms,
    side: THREE.DoubleSide,
    transparent: true,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;

  const scene = new THREE.Scene();
  scene.add(mesh);

  const camera = new THREE.PerspectiveCamera(FOV, PLANE_W / PLANE_H, 0.1, 20);

  const resize = () => {
    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;
    const aspect = width / height;
    camera.aspect = aspect;
    // Fit the whole plane whichever way the box is proportioned.
    const half = THREE.MathUtils.degToRad(FOV) / 2;
    const byHeight = PLANE_H / 2 / Math.tan(half);
    const byWidth = PLANE_W / 2 / (Math.tan(half) * aspect);
    camera.position.z = Math.max(byHeight, byWidth);
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };
  window.addEventListener('resize', resize);
  resize();

  // --- Textures -------------------------------------------------------------
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous'); // i.ytimg.com serves Access-Control-Allow-Origin: *
  const cache = new Map();

  const load = (url) => {
    if (cache.has(url)) return cache.get(url);
    const pending = new Promise((resolve) => {
      loader.load(
        url,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.minFilter = THREE.LinearFilter;
          texture.generateMipmaps = false;
          resolve(texture);
        },
        undefined,
        () => resolve(null)
      );
    });
    cache.set(url, pending);
    return pending;
  };

  /**
   * Pulls every poster into the texture cache up front. Without it the first
   * flip would have to wait on a network round trip, and the new slide would be
   * on screen before the transition covering it had started.
   */
  const prewarm = (urls) => urls.forEach(load);

  // --- Playback -------------------------------------------------------------
  let disposed = false;
  let frame = 0;
  let running = null;
  let settle = null;

  const draw = () => renderer.render(scene, camera);

  const loop = () => {
    if (disposed) return;
    frame = requestAnimationFrame(loop);
    draw();
  };

  const stop = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  };

  /**
   * Flips from one poster to the next. Resolves when the flip has landed, or
   * immediately if either image could not be loaded — the caller falls back to
   * simply showing the new slide.
   */
  const play = async (fromUrl, toUrl, dir = 1) => {
    const [from, to] = await Promise.all([load(fromUrl), load(toUrl)]);
    if (disposed || !from || !to) return false;

    // A flick that arrives mid-flip supersedes this one. The old animation is
    // paused and its promise settled here rather than left pending, so the
    // caller that is waiting to uncover the stage always gets its turn.
    settle?.(false);
    running?.pause();
    stop();

    uniforms.uFrom.value = from;
    uniforms.uTo.value = to;
    uniforms.uDir.value = dir >= 0 ? 1 : -1;
    uniforms.uProgress.value = 0;

    draw();
    frame = requestAnimationFrame(loop);

    return new Promise((resolve) => {
      settle = (value) => {
        settle = null;
        resolve(value);
      };
      running = animate(uniforms.uProgress, {
        value: [0, 1],
        duration: DURATION,
        ease: 'linear',
        onComplete: () => {
          if (!disposed) draw();
          stop();
          settle?.(true);
        },
      });
    });
  };

  const dispose = () => {
    disposed = true;
    stop();
    settle?.(false);
    running?.pause();
    window.removeEventListener('resize', resize);
    cache.forEach((pending) => pending.then((texture) => texture?.dispose()));
    cache.clear();
    geometry.dispose();
    material.dispose();
    renderer.dispose();
  };

  return { play, prewarm, resize, dispose };
}
