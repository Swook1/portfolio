import { createAnimatable, utils } from 'animejs';

const STAR_COUNT = 900;
const FIELD = { x: 26, y: 18, z: 60 };
const FRAME_MS = 1000 / 30; // the backdrop never needs more than 30fps

/** Soft radial sprite used for the nebula glows. */
function glowTexture(THREE, color) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, `${color}cc`);
  gradient.addColorStop(0.4, `${color}44`);
  gradient.addColorStop(1, `${color}00`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * The site-wide backdrop: a star field with real depth plus a few drifting
 * nebula glows. Scrolling flies the camera through it and the pointer tilts
 * it, both through damped anime.js animatables.
 *
 * Deliberately cheap: 30fps, capped pixel ratio, points rather than meshes,
 * and paused whenever the tab is hidden.
 */
export async function createSpace({ canvas }) {
  const THREE = await import('three');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
  camera.position.set(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

  // --- Stars ----------------------------------------------------------------
  const positions = new Float32Array(STAR_COUNT * 3);
  const sizes = new Float32Array(STAR_COUNT);
  for (let i = 0; i < STAR_COUNT; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * FIELD.x * 2;
    positions[i * 3 + 1] = (Math.random() - 0.5) * FIELD.y * 2;
    positions[i * 3 + 2] = -Math.random() * FIELD.z;
    sizes[i] = Math.random() * 0.09 + 0.03;
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  starGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const starMaterial = new THREE.PointsMaterial({
    color: 0x9ec5ff,
    size: 0.08,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
  });
  const stars = new THREE.Points(starGeometry, starMaterial);
  scene.add(stars);

  // --- Nebula glows ---------------------------------------------------------
  const glows = [
    { color: '#3b82f6', pos: [-9, 4, -22], scale: 26 },
    { color: '#7c3aed', pos: [11, -3, -30], scale: 30 },
    { color: '#0ea5e9', pos: [2, 7, -44], scale: 34 },
  ].map(({ color, pos, scale }) => {
    const material = new THREE.SpriteMaterial({
      map: glowTexture(THREE, color),
      transparent: true,
      // Kept low on purpose: this sits behind body copy.
      opacity: 0.3,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const sprite = new THREE.Sprite(material);
    sprite.position.set(...pos);
    sprite.scale.setScalar(scale);
    scene.add(sprite);
    return { sprite, material, base: pos };
  });

  // --- Scroll + pointer -----------------------------------------------------
  // Both are damped animatables, so the camera eases instead of snapping.
  const flight = createAnimatable(camera.position, { z: 900, x: 700, y: 700, ease: 'out(3)' });
  const tilt = createAnimatable(camera.rotation, { x: 900, y: 900, ease: 'out(3)' });

  let pointer = { x: 0, y: 0 };

  const onScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? utils.clamp(window.scrollY / max, 0, 1) : 0;
    // Travel most of the field's depth across the page.
    flight.z(-progress * (FIELD.z - 14));
  };

  const onPointerMove = (event) => {
    pointer = {
      x: (event.clientX / window.innerWidth - 0.5) * 2,
      y: (event.clientY / window.innerHeight - 0.5) * 2,
    };
    flight.x(pointer.x * 1.6);
    flight.y(-pointer.y * 1.1);
    tilt.y(-pointer.x * 0.05);
    tilt.x(pointer.y * 0.035);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  onScroll();

  // --- Sizing ---------------------------------------------------------------
  const resize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
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

    const t = now * 0.00006;
    stars.rotation.y = t * 0.4;
    glows.forEach((glow, i) => {
      glow.sprite.position.x = glow.base[0] + Math.sin(t + i * 2) * 3.2;
      glow.sprite.position.y = glow.base[1] + Math.cos(t * 0.8 + i) * 2.4;
    });

    renderer.render(scene, camera);
  };
  // Paint one frame straight away so the canvas is never blank while waiting
  // for the first animation frame.
  renderer.render(scene, camera);
  frame = requestAnimationFrame(render);

  const dispose = () => {
    disposed = true;
    cancelAnimationFrame(frame);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('resize', resize);
    flight.revert();
    tilt.revert();
    starGeometry.dispose();
    starMaterial.dispose();
    glows.forEach((glow) => {
      glow.material.map.dispose();
      glow.material.dispose();
    });
    renderer.dispose();
  };

  return { dispose };
}
