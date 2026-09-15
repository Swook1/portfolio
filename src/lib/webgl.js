/**
 * Whether this browser can actually give us a WebGL2 context. Checked before
 * any three.js import so a machine without it never downloads the library.
 */
export function webglAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(window.WebGLRenderingContext && canvas.getContext('webgl2'));
  } catch {
    return false;
  }
}

/**
 * Whether this device should get the cheap backdrop profile: fewer stars, a
 * smaller drawing buffer, a shorter noise loop.
 *
 * Deliberately not a width check on its own. A phone in landscape is wider
 * than a small laptop window, and the thing that actually matters is the GPU
 * and the thermal budget behind it — so this leans on the touch/hover signals
 * and the core and memory hints, and only uses width as one vote among them.
 */
export function lowPowerDevice() {
  if (typeof window === 'undefined') return true;

  const coarse =
    window.matchMedia('(hover: none)').matches ||
    window.matchMedia('(pointer: coarse)').matches;
  const narrow = window.matchMedia('(max-width: 1023px)').matches;
  const fewCores = (navigator.hardwareConcurrency || 8) <= 4;
  // Chromium-only; absent elsewhere, which is why it only ever votes.
  const littleMemory = (navigator.deviceMemory || 8) <= 4;

  // Touch plus a narrow viewport is a phone or a small tablet. Either signal
  // on its own is not enough: touchscreen laptops report coarse pointers, and
  // a narrow desktop window is still a desktop GPU.
  if (coarse && narrow) return true;
  return coarse && (fewCores || littleMemory);
}
