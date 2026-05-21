/**
 * Canvas Renderer — Bounding Box Drawing Utility
 *
 * Draws YOLO-style bounding boxes with confidence labels on a canvas
 * overlay. Designed for imperative use via refs — no React state.
 */

const PEST_COLORS = {
  kutu_daun:   '#EF4444',
  ulat_grayak: '#F97316',
  kutu_kebul:  '#FBBF24',
  thrips:      '#A855F7',
  tungau:      '#3B82F6',
  belalang:    '#22C55E',
  default:     '#EC4899',
};

/**
 * Draw bounding boxes on a canvas element.
 * @param {HTMLCanvasElement} canvas
 * @param {Array} detections - Array of { class_name, confidence, bbox }
 * @param {HTMLImageElement} imgElement - Image element to calculate natural resolution and offsets
 */
export function drawBoundingBoxes(canvas, detections, imgElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Sync canvas resolution to display size
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  ctx.clearRect(0, 0, rect.width, rect.height);

  // Defensive check: If image hasn't fully decoded, naturalWidth is 0.
  let imgWidth = imgElement?.naturalWidth || 640;
  let imgHeight = imgElement?.naturalHeight || 480;

  if (!imgElement?.naturalWidth) {
    console.warn('[CanvasRenderer] img.naturalWidth is 0! Image not fully loaded. Falling back to 640x480 to prevent divide-by-zero math.');
  }

  // Calculate object-contain letterbox geometry
  const scale = Math.min(rect.width / imgWidth, rect.height / imgHeight);
  const offsetX = (rect.width - (imgWidth * scale)) / 2;
  const offsetY = (rect.height - (imgHeight * scale)) / 2;

  // Verbose math trace for debugging (throttle in production)
  // console.debug(`[Canvas Math] Container: ${rect.width}x${rect.height}, Intrinsic: ${imgWidth}x${imgHeight}, Scale: ${scale.toFixed(4)}, OffsetX: ${offsetX.toFixed(1)}, OffsetY: ${offsetY.toFixed(1)}`);

  for (const det of detections) {
    if (!det.bbox || det.bbox.length < 4) {
      console.warn('[CanvasRenderer] Invalid bbox array:', det.bbox);
      continue;
    }

    const [x, y, w, h] = det.bbox;
    
    // Map YOLO coordinates to the letterboxed container space
    const sx = offsetX + (x * scale);
    const sy = offsetY + (y * scale);
    const sw = w * scale;
    const sh = h * scale;
    const color = PEST_COLORS[det.class_name] || PEST_COLORS.default;
    const confidence = ((det.confidence || 0) * 100).toFixed(0);
    const label = `${det.class_name || 'pest'} ${confidence}%`;

    // Draw box
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(sx, sy, sw, sh);

    // Draw label background
    ctx.font = '600 11px Inter, system-ui, sans-serif';
    const textWidth = ctx.measureText(label).width;
    ctx.fillStyle = color;
    ctx.fillRect(sx, sy - 20, textWidth + 10, 20);

    // Draw label text
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(label, sx + 5, sy - 6);
  }
}

/**
 * Clear all bounding boxes from a canvas.
 * @param {HTMLCanvasElement} canvas
 */
export function clearCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}
