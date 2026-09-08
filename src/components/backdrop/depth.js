/**
 * Keeps a star inside the slab of depth `depth` that sits directly in front of
 * the camera, wrapping it around when it falls out either end.
 *
 * Scrolling flies the camera most of the field's depth, so without this the
 * stars are left behind one by one and the sky empties out by the bottom of
 * the page. Wrapping in both directions means scrolling back up refills it too.
 */
export function wrapDepth(z, cameraZ, depth) {
  const near = cameraZ; // anything past this is behind the camera
  const far = cameraZ - depth;
  if (z > near) return z - depth;
  if (z < far) return z + depth;
  return z;
}
