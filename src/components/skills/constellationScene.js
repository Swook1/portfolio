import { animate, createAnimatable, createSpring, stagger, utils } from 'animejs';

const RADIUS = 3.2;
const TILE_PX = 192;

/**
 * Nodes ride a ring rather than a sphere: a sphere puts tiles in front of the
 * hub, and the hub is a DOM overlay pinned to the centre. The ring keeps the
 * middle clear while still reading as 3D once it spins.
 */
function ringPositions(count) {
  const points = [];
  for (let i = 0; i < count; i += 1) {
    const theta = (i / count) * Math.PI * 2;
    const lift = Math.sin(theta * 2) * 0.55; // gentle wave so it isn't a flat disc
    points.push([Math.cos(theta) * RADIUS, lift, Math.sin(theta) * RADIUS]);
  }
  return points;
}

/** Draws one skill tile (rounded card + icon) into a canvas for use as a texture. */
function drawTile(image, { active }) {
  const canvas = document.createElement('canvas');
  canvas.width = TILE_PX;
  canvas.height = TILE_PX;
  const ctx = canvas.getContext('2d');
  const pad = 6;
  const size = TILE_PX - pad * 2;
  const radius = 34;

  ctx.beginPath();
  ctx.roundRect(pad, pad, size, size, radius);
  ctx.fillStyle = active ? '#1b2331' : '#151c28';
  ctx.fill();
  ctx.lineWidth = active ? 6 : 3;
  ctx.strokeStyle = active ? '#3b82f6' : '#253046';
  ctx.stroke();

  const iconSize = TILE_PX * 0.52;
  const offset = (TILE_PX - iconSize) / 2;
  ctx.drawImage(image, offset, offset, iconSize, iconSize);
  return canvas;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Builds the WebGL skills constellation.
 *
 * three.js owns the rendering; every value that moves — the sphere's rotation,
 * each tile's scale — is tweened by anime.js, exactly as it drives DOM
 * elsewhere on the site. Returns handles the React component uses to select a
 * node, replay the entrance, and tear everything down.
 */
export async function createConstellation({ canvas, skills, onSelect }) {
  const THREE = await import('three');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 2.9, 9.9);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const world = new THREE.Group();
  scene.add(world);

  const positions = ringPositions(skills.length);
  const images = await Promise.all(skills.map((skill) => loadImage(skill.icon)));

  const nodes = images.map((image, i) => {
    const idle = new THREE.CanvasTexture(drawTile(image, { active: false }));
    const active = new THREE.CanvasTexture(drawTile(image, { active: true }));
    idle.colorSpace = THREE.SRGBColorSpace;
    active.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.SpriteMaterial({
      map: idle,
      transparent: true,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.position.set(...positions[i]);
    sprite.scale.setScalar(0.001); // entrance animates this up
    sprite.userData.index = i;
    world.add(sprite);

    // A line from the hub out to the node.
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(...positions[i]),
    ]);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x253046,
      transparent: true,
      opacity: 0.9,
    });
    const line = new THREE.Line(geometry, lineMaterial);
    world.add(line);

    return {
      sprite,
      material,
      line,
      lineMaterial,
      idle,
      active,
      scale: { value: 0 },
      worldPos: new THREE.Vector3(),
    };
  });

  // Rotation is a damped anime.js animatable, so drag and idle spin share one
  // smoothed value instead of fighting each other. The initial tilt pitches the
  // ring so its near edge passes below the hub overlay rather than across it.
  const spin = { x: 0.3, y: 0 };
  world.rotation.x = spin.x;
  const rotation = createAnimatable(world.rotation, {
    x: 600,
    y: 600,
    ease: 'out(3)',
  });

  let activeIndex = -1;
  let idleSpin = true;
  let dragging = false;
  let disposed = false;

  const setActive = (index) => {
    if (index === activeIndex) return;
    activeIndex = index;
    nodes.forEach((node, i) => {
      node.material.map = i === index ? node.active : node.idle;
      node.material.needsUpdate = true;
      node.lineMaterial.color.set(i === index ? 0x3b82f6 : 0x253046);
      animate(node.scale, {
        value: i === index ? 1.25 : 1,
        duration: 600,
        ease: createSpring({ stiffness: 140, damping: 14 }),
      });
    });
    if (index >= 0) onSelect?.(index);
  };

  // --- Pointer handling -----------------------------------------------------
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let last = null;

  const pick = (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(
      nodes.map((n) => n.sprite),
      false
    );
    if (hits.length) setActive(hits[0].object.userData.index);
  };

  const onPointerMove = (event) => {
    if (dragging && last) {
      spin.y += (event.clientX - last.x) * 0.006;
      spin.x = utils.clamp(spin.x + (event.clientY - last.y) * 0.004, -0.45, 0.45);
      last = { x: event.clientX, y: event.clientY };
      rotation.x(spin.x);
      rotation.y(spin.y);
      return;
    }
    pick(event);
  };

  const onPointerDown = (event) => {
    dragging = true;
    idleSpin = false;
    last = { x: event.clientX, y: event.clientY };
    canvas.setPointerCapture?.(event.pointerId);
  };

  const onPointerUp = () => {
    dragging = false;
    last = null;
    idleSpin = true;
  };

  const onPointerLeave = () => {
    dragging = false;
    last = null;
    idleSpin = true;
  };

  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointerleave', onPointerLeave);

  // --- Sizing ---------------------------------------------------------------
  const resize = () => {
    const { clientWidth, clientHeight } = canvas;
    if (!clientWidth || !clientHeight) return;
    camera.aspect = clientWidth / clientHeight;
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
    if (idleSpin) {
      spin.y += 0.0016;
      rotation.y(spin.y);
    }
    nodes.forEach((node) => {
      node.sprite.scale.setScalar(node.scale.value);
      // Depth cue: tiles on the far side of the ring dim and the lines with
      // them, so the spin reads as rotation rather than sliding.
      node.sprite.getWorldPosition(node.worldPos);
      const depth = utils.mapRange(node.worldPos.z, -RADIUS, RADIUS, 0.35, 1);
      node.material.opacity = depth;
      node.lineMaterial.opacity = depth * 0.9;
    });
    renderer.render(scene, camera);
  };
  render();

  // --- Entrance -------------------------------------------------------------
  const reveal = () => {
    animate(
      nodes.map((n) => n.scale),
      {
        value: [0, 1],
        duration: 1200,
        delay: stagger(60),
        ease: createSpring({ stiffness: 110, damping: 14 }),
      }
    );
    setActive(0);
  };

  const dispose = () => {
    disposed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointerleave', onPointerLeave);
    rotation.revert();
    nodes.forEach((node) => {
      node.idle.dispose();
      node.active.dispose();
      node.material.dispose();
      node.line.geometry.dispose();
      node.lineMaterial.dispose();
    });
    renderer.dispose();
  };

  return { reveal, setActive, dispose };
}
