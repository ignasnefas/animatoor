/**
 * Pixelation and retro effect utilities with GPU optimization
 */

// Cache for temporary canvases to avoid allocation churn
const canvasCache: Map<string, OffscreenCanvas> = new Map();

function getOrCreateOffscreenCanvas(key: string, width: number, height: number): OffscreenCanvas {
  let canvas = canvasCache.get(key);
  if (!canvas || canvas.width !== width || canvas.height !== height) {
    canvas = new OffscreenCanvas(width, height);
    canvasCache.set(key, canvas);
  }
  return canvas;
}

/**
 * Optimized pixelation using ImageData (much faster than individual getImageData calls)
 */
export function applyPixelation(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  pixelSize: number
): void {
  if (pixelSize <= 1) return;

  const width = canvas.width;
  const height = canvas.height;

  // Get entire image data at once (much faster than repeated getImageData calls)
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Process in-place: for each pixel block, apply average color
  for (let y = 0; y < height; y += pixelSize) {
    for (let x = 0; x < width; x += pixelSize) {
      // Sample corner pixel (fast approximation)
      const pixelIndex = (y * width + x) * 4;
      const r = data[pixelIndex];
      const g = data[pixelIndex + 1];
      const b = data[pixelIndex + 2];
      const a = data[pixelIndex + 3];

      // Apply color to entire block
      const blockWidth = Math.min(pixelSize, width - x);
      const blockHeight = Math.min(pixelSize, height - y);

      for (let by = 0; by < blockHeight; by++) {
        for (let bx = 0; bx < blockWidth; bx++) {
          const idx = ((y + by) * width + (x + bx)) * 4;
          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = a;
        }
      }
    }
  }

  // Write back optimized data all at once
  ctx.putImageData(imageData, 0, 0);
}

/**
 * High-performance pixelation for pre-downsampled images
 * Significantly faster for high-quality output
 */
export function applyPixelationFast(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  pixelSize: number
): void {
  if (pixelSize <= 1) return;

  const width = canvas.width;
  const height = canvas.height;

  // Create a small temporary canvas at downsampled resolution
  const smallWidth = Math.ceil(width / pixelSize);
  const smallHeight = Math.ceil(height / pixelSize);
  const tempCanvas = getOrCreateOffscreenCanvas('pixelation', smallWidth, smallHeight);
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return;

  // Downscale to pixelated resolution
  tempCtx.drawImage(canvas, 0, 0, width, height, 0, 0, smallWidth, smallHeight);

  // Scale back up with nearest-neighbor interpolation
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tempCanvas, 0, 0, smallWidth, smallHeight, 0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
}

export function clearCanvasCache(): void {
  canvasCache.clear();
}
