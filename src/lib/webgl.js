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
