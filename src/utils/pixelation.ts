/**
 * Pixelation and retro effect utilities
 */

/**
 * Apply pixelation effect to canvas
 */
export function applyPixelation(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  pixelSize: number
): void {
  if (pixelSize <= 1) return;

  // Create temporary canvas to read from
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return;

  // Copy current canvas to temp
  tempCtx.drawImage(canvas, 0, 0);

  // Clear and redraw pixelated
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < canvas.height; y += pixelSize) {
    for (let x = 0; x < canvas.width; x += pixelSize) {
      // Get color from one pixel of the pixelated area
      const imageData = tempCtx.getImageData(x, y, 1, 1);
      const data = imageData.data;
      ctx.fillStyle = `rgba(${data[0]}, ${data[1]}, ${data[2]}, ${data[3] / 255})`;

      // Draw pixelated block
      ctx.fillRect(x, y, pixelSize, pixelSize);
    }
  }
}
