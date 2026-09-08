import { createAnimatable, utils } from 'animejs';

const FRAME_MS = 1000 / 30; // the backdrop never needs more than 30fps
const RENDER_SCALE = 0.7; // soft gradients survive being rendered small

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  uniform float uTime;
  uniform float uScroll;
  uniform vec2 uPointer;
  uniform float uAspect;

  // Cheap value noise + 3-octave fbm. Enough for slow, large-scale colour
  // fields; nothing here needs the quality of simplex.
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    float total = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 3; i++) {
      total += noise(p) * amplitude;
      p *= 2.02;
      amplitude *= 0.5;
    }
    return total;
  }

  void main() {
    vec2 uv = vUv;
    // Squashed vertically so the noise stretches into tall streaks: that
    // anisotropy is what separates curtains from clouds.
    vec2 p = vec2(uv.x * uAspect, uv.y * 0.42) * 2.6;
    p += uPointer * 0.12;

    float t = uTime * 0.025;

    // Domain warp: the field folds through itself.
    vec2 q = vec2(fbm(p + t), fbm(p + vec2(3.2, 1.7) - t));
    float f = fbm(p + q * 1.9 + vec2(0.0, uScroll * 0.9));
    f = pow(smoothstep(0.15, 0.85, f), 1.4); // tighten the bands

    vec3 accent = vec3(0.231, 0.510, 0.965); // #3b82f6
    vec3 violet = vec3(0.486, 0.227, 0.929); // #7c3aed
    vec3 cyan   = vec3(0.055, 0.647, 0.914); // #0ea5e9

    vec3 colour = mix(accent, violet, smoothstep(0.25, 0.85, f));
    colour = mix(colour, cyan, smoothstep(0.6, 1.0, q.x) * 0.65);

    // Low on purpose: body copy sits on top of this.
    float alpha = f * 0.4;

    // Fade toward the edges so the page background carries the frame.
    float vignette = smoothstep(1.05, 0.2, length(uv - 0.5) * 1.7);
    alpha *= vignette;

    gl_FragColor = vec4(colour, alpha);
  }
`;

/**
 * The site-wide backdrop: a slow aurora field.
 *
 * One full-screen quad rather than a particle system — large, low-frequency
 * motion that never competes with body copy, and the same visual idea as the
 * CSS blob tier it fades in over, so desktop and mobile look like one site.
 *
 * anime.js damps the scroll and pointer values feeding the shader; three.js
 * only draws.
 */
export async function createAurora({ canvas }) {
  const THREE = await import('three');

  const scene = new THREE.Scene();
  // A quad in clip space: no camera transform needed.
  const camera = new THREE.Camera();

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5) * RENDER_SCALE);

  const uniforms = {
    uTime: { value: 0 },
    uScroll: { value: 0 },
    uPointer: { value: new THREE.Vector2(0, 0) },
    uAspect: { value: 1 },
  };

  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms,
    transparent: true,
    depthWrite: false,
    depthTest: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  scene.add(quad);

  // --- Scroll + pointer, damped by anime.js ---------------------------------
  const scrollDrift = createAnimatable(uniforms.uScroll, { value: 1200, ease: 'out(3)' });
  const pointerDrift = createAnimatable(uniforms.uPointer.value, {
    x: 900,
    y: 900,
    ease: 'out(3)',
  });

  const onScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? utils.clamp(window.scrollY / max, 0, 1) : 0;
    scrollDrift.value(progress * 2.4);
  };

  const onPointerMove = (event) => {
    pointerDrift.x((event.clientX / window.innerWidth - 0.5) * 2);
    pointerDrift.y((event.clientY / window.innerHeight - 0.5) * 2);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  onScroll();

  // --- Sizing ---------------------------------------------------------------
  const resize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    uniforms.uAspect.value = width / height;
    renderer.setSize(width, height, false);
  };
  window.addEventListener('resize', resize);
  resize();

  // --- Frame loop -----------------------------------------------------------
  let frame = 0;
  let disposed = false;
  let lastFrame = 0;

  const render = (now) => {
    if (disposed) return;
    frame = requestAnimationFrame(render);
    if (document.hidden || now - lastFrame < FRAME_MS) return;
    lastFrame = now;

    uniforms.uTime.value = now * 0.001;
    renderer.render(scene, camera);
  };
  // Paint once immediately so the canvas is never blank while waiting for the
  // first animation frame.
  renderer.render(scene, camera);
  frame = requestAnimationFrame(render);

  const dispose = () => {
    disposed = true;
    cancelAnimationFrame(frame);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('resize', resize);
    scrollDrift.revert();
    pointerDrift.revert();
    quad.geometry.dispose();
    material.dispose();
    renderer.dispose();
  };

  return { dispose };
}
