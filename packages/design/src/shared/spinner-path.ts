// Keep the original Spinner's radius and dash timing, fitted to a 24px grid.
export const SPINNER_SCALE = 24 / 44;
export const SPINNER_RADIUS = 18 * SPINNER_SCALE;
const circumference = 2 * Math.PI * 18;

/** Snapshot the visible dash, including clipping at the circle's seam. */
export function spinnerPath(length: number, offset: number, rotation: number) {
  // The loader's 200-unit gap exceeds its circumference, so at most one dash
  // intersects the circle. Its negative offset moves that dash towards the end.
  const start = Math.min(circumference, Math.max(0, -offset));
  const end = Math.min(circumference, Math.max(0, length - offset));
  if (end <= start) return '';
  const angle = (rotation * Math.PI) / 180;
  const from = start / 18 + angle;
  const to = end / 18 + angle;
  const x1 = 12 + SPINNER_RADIUS * Math.cos(from);
  const y1 = 12 + SPINNER_RADIUS * Math.sin(from);
  const x2 = 12 + SPINNER_RADIUS * Math.cos(to);
  const y2 = 12 + SPINNER_RADIUS * Math.sin(to);
  return `M${x1} ${y1}A${SPINNER_RADIUS} ${SPINNER_RADIUS} 0 ${to - from > Math.PI ? 1 : 0} 1 ${x2} ${y2}`;
}
