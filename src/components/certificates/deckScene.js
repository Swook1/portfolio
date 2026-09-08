import { animate, createAnimatable, createSpring, stagger, utils } from 'animejs';

const RADIUS = 3.9;
const CARD_H = 2.05;
const CAMERA_GAP = 4.3;
const DRAG_PER_PX = 0.0055; // radians of carousel per pixel dragged
const CLICK_SLOP = 6; // px of movement still counted as a click, not a drag

/** Wraps `target` to whichever equivalent angle is nearest `from`. */
export function shortestAngle(from, target) {
  const twoPi = Math.PI * 2;
  let a = target;
  while (a - from > Math.PI) a -= twoPi;
  while (from - a > Math.PI) a += twoPi;
  return a;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * The certificates deck as a real carousel in 3D.
 *
 * Every card sits on a circle and faces outward; turning the group brings one
 * to the front. That is the whole model — there is no separate "centre" card,
 * so the deck reads the same at four certificates as it will at forty, and the
 * spacing never needs re-tuning.
 *
 * three.js draws; anime.js owns every value that moves, as it does in the
 * skills constellation. The React component stays the source of truth for which
 * certificate is current: this reports intent through `onSelect`/`onOpen` and
 * waits to be told, rather than keeping its own index.
 */
export async function createDeck({ canvas, certificates, onSelect, onOpen }) {
  const THREE = await import('three');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0.25, RADIUS + CAMERA_GAP);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const world = new THREE.Group();
  scene.add(world);

  const count = certificates.length;
  const step = (Math.PI * 2) / count;

  const images = await Promise.all(certificates.map((cert) => loadImage(cert.thumb)));

  const cards = images.map((image, i) => {
    const texture = new THREE.Texture(image);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;

    // Each certificate keeps its own proportions rather than being squeezed
    // into a shared frame.
    const aspect = image.naturalWidth / image.naturalHeight || 1.4;
    const geometry = new THREE.PlaneGeometry(CARD_H * aspect, CARD_H);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
    });

    const angle = i * step;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(Math.sin(angle) * RADIUS, 0, Math.cos(angle) * RADIUS);
    mesh.rotation.y = angle;
    mesh.scale.setScalar(0.001); // the entrance animates this up
    mesh.userData.index = i;
    world.add(mesh);

    return { mesh, material, texture, geometry, scale: { value: 0 }, worldPos: new THREE.Vector3() };
  });

  // One damped value drives the carousel, so a drag, an arrow button and the
  // autoplay all feed the same easing instead of fighting each other.
  let angle = 0;
  const spin = createAnimatable(world.rotation, { y: 700, ease: 'out(3)' });

  let disposed = false;
  let hovering = false;

  const setActive = (index) => {
    angle = shortestAngle(angle, -index * step);
    spin.y(angle);
  };

  // --- Pointer --------------------------------------------------------------
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let drag = null;

  const meshes = cards.map((card) => card.mesh);

  const hit = (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(meshes, false);
    return hits.length ? hits[0].object.userData.index : -1;
  };

  /** Which card is currently facing the camera. */
  const frontIndex = () => ((Math.round(-angle / step) % count) + count) % count;

  const onPointerDown = (event) => {
    drag = { x: event.clientX, startX: event.clientX, moved: 0, base: angle };
    canvas.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event) => {
    if (!drag) {
      const index = hit(event);
      hovering = index >= 0;
      canvas.style.cursor = hovering ? 'grab' : 'default';
      return;
    }
    drag.moved = Math.max(drag.moved, Math.abs(event.clientX - drag.startX));
    canvas.style.cursor = 'grabbing';
    angle = drag.base + (event.clientX - drag.startX) * DRAG_PER_PX;
    spin.y(angle);
  };

  const onPointerUp = (event) => {
    if (!drag) return;
    const wasDrag = drag.moved > CLICK_SLOP;
    drag = null;
    canvas.style.cursor = hovering ? 'grab' : 'default';

    if (wasDrag) {
      // Snap to whichever card ended up nearest the front and let the component
      // catch up, so the deck and the caption never disagree.
      const index = frontIndex();
      setActive(index);
      onSelect?.(index);
      return;
    }

    const index = hit(event);
    if (index < 0) return;
    // Clicking the card already at the front opens it; clicking any other
    // brings it round.
    if (index === frontIndex()) onOpen?.(index);
    else onSelect?.(index);
  };

  const onPointerLeave = () => {
    drag = null;
    hovering = false;
    canvas.style.cursor = 'default';
  };

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointerleave', onPointerLeave);

  // --- Sizing ---------------------------------------------------------------
  const resize = () => {
    const { clientWidth, clientHeight } = canvas;
    if (!clientWidth || !clientHeight) return;
    camera.aspect = clientWidth / clientHeight;
    // Narrow viewports have to pull back or the front card runs off the sides.
    camera.position.z = RADIUS + CAMERA_GAP * utils.clamp(1.6 / camera.aspect, 1, 2.1);
    camera.updateProjectionMatrix();
    renderer.setSize(clientWidth, clientHeight, false);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  // --- Frame loop -----------------------------------------------------------
  let frame = 0;
  const render = () => {
    if (disposed) return;
    frame = requestAnimationFrame(render);
    cards.forEach((card) => {
      card.mesh.scale.setScalar(card.scale.value);
      // Depth cue: cards swinging round the back dim, so the turn reads as
      // rotation rather than as cards sliding sideways.
      card.mesh.getWorldPosition(card.worldPos);
      card.material.opacity = utils.mapRange(card.worldPos.z, -RADIUS, RADIUS, 0.12, 1);
    });
    renderer.render(scene, camera);
  };
  render();

  const reveal = () => {
    animate(
      cards.map((card) => card.scale),
      {
        value: [0, 1],
        duration: 1100,
        delay: stagger(70),
        ease: createSpring({ stiffness: 110, damping: 15 }),
      }
    );
  };

  const dispose = () => {
    disposed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointerleave', onPointerLeave);
    spin.revert();
    cards.forEach((card) => {
      card.texture.dispose();
      card.material.dispose();
      card.geometry.dispose();
    });
    renderer.dispose();
  };

  return { reveal, setActive, dispose };
}
