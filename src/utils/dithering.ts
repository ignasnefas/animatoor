/**
 * Dithering algorithms for retro visual effects
 */

export type DitheringType = 'none' | 'bayer' | 'floydSteinberg' | 'ordered';

/**
 * Bayer matrix for ordered dithering
 */
const bayerMatrix2x2 = [
  [0, 2],
  [3, 1],
];

const bayerMatrix4x4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

const bayerMatrix8x8 = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
];

/**
 * Apply Bayer ordered dithering to image data
 */
export function applyBayerDithering(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  palette: [number, number, number][],
  intensity: number = 1.0,
  resolution: number = 1.0
): void {
  // If resolution is < 1, process at lower resolution and upscale
  if (resolution < 1) {
    applyDitheringAtLowerResolution(data, width, height, palette, intensity, resolution, 'bayer');
    return;
  }

  const matrix = bayerMatrix8x8;
  const matrixSize = 8;

  for (let i = 0; i < data.length; i += 4) {
    const pixelIndex = i / 4;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);

    const mx = x % matrixSize;
    const my = y % matrixSize;
    const dither = (matrix[my][mx] / 64 - 0.5) * 255 * intensity;

    const r = Math.max(0, Math.min(255, data[i] + dither));
    const g = Math.max(0, Math.min(255, data[i + 1] + dither));
    const b = Math.max(0, Math.min(255, data[i + 2] + dither));

    const [pr, pg, pb] = findNearestColor(r, g, b, palette);
    data[i] = pr;
    data[i + 1] = pg;
    data[i + 2] = pb;
  }
}

/**
 * Apply Floyd-Steinberg dithering (diffusion-based)
 */
export function applyFloydSteinbergDithering(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  palette: [number, number, number][],
  intensity: number = 1.0,
  resolution: number = 1.0
): void {
  // If resolution is < 1, process at lower resolution and upscale
  if (resolution < 1) {
    applyDitheringAtLowerResolution(data, width, height, palette, intensity, resolution, 'floydSteinberg');
    return;
  }

  // Create a working copy to preserve original during diffusion
  const workingData = new Uint8ClampedArray(data);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      const r = workingData[idx];
      const g = workingData[idx + 1];
      const b = workingData[idx + 2];
      const a = workingData[idx + 3];

      // Find nearest palette color
      const [pr, pg, pb] = findNearestColor(r, g, b, palette);

      // Calculate error
      const errR = (r - pr) * intensity;
      const errG = (g - pg) * intensity;
      const errB = (b - pb) * intensity;

      // Set pixel to nearest color
      data[idx] = pr;
      data[idx + 1] = pg;
      data[idx + 2] = pb;
      data[idx + 3] = a;

      // Distribute error to neighboring pixels
      const distribute = (ox: number, oy: number, weight: number) => {
        const nx = x + ox;
        const ny = y + oy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nidx = (ny * width + nx) * 4;
          workingData[nidx] = Math.max(0, Math.min(255, workingData[nidx] + errR * weight));
          workingData[nidx + 1] = Math.max(0, Math.min(255, workingData[nidx + 1] + errG * weight));
          workingData[nidx + 2] = Math.max(0, Math.min(255, workingData[nidx + 2] + errB * weight));
        }
      };

      distribute(1, 0, 7 / 16);   // right
      distribute(-1, 1, 3 / 16);  // down-left
      distribute(0, 1, 5 / 16);   // down
      distribute(1, 1, 1 / 16);   // down-right
    }
  }
}

/**
 * Apply dithering at a lower resolution for better performance
 * Downscales, dithers, and upscales back using nearest-neighbor
 */
function applyDitheringAtLowerResolution(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  palette: [number, number, number][],
  intensity: number,
  resolution: number,
  type: 'bayer' | 'floydSteinberg'
): void {
  // Calculate lower resolution dimensions
  const scaledWidth = Math.max(2, Math.floor(width * resolution));
  const scaledHeight = Math.max(2, Math.floor(height * resolution));
  const scaleX = width / scaledWidth;
  const scaleY = height / scaledHeight;

  // Create downscaled image data
  const scaledData = new Uint8ClampedArray(scaledWidth * scaledHeight * 4);
  
  // Downscale by averaging
  for (let y = 0; y < scaledHeight; y++) {
    for (let x = 0; x < scaledWidth; x++) {
      let r = 0, g = 0, b = 0, a = 0, count = 0;
      
      const x0 = Math.floor(x * scaleX);
      const y0 = Math.floor(y * scaleY);
      const x1 = Math.floor((x + 1) * scaleX);
      const y1 = Math.floor((y + 1) * scaleY);
      
      for (let py = y0; py < y1; py++) {
        for (let px = x0; px < x1; px++) {
          const idx = (py * width + px) * 4;
          r += data[idx];
          g += data[idx + 1];
          b += data[idx + 2];
          a += data[idx + 3];
          count++;
        }
      }
      
      const scaledIdx = (y * scaledWidth + x) * 4;
      scaledData[scaledIdx] = r / count;
      scaledData[scaledIdx + 1] = g / count;
      scaledData[scaledIdx + 2] = b / count;
      scaledData[scaledIdx + 3] = a / count;
    }
  }

  // Apply dithering to scaled data
  if (type === 'bayer') {
    applyBayerDithering(scaledData, scaledWidth, scaledHeight, palette, intensity, 1.0);
  } else {
    applyFloydSteinbergDithering(scaledData, scaledWidth, scaledHeight, palette, intensity, 1.0);
  }

  // Upscale back to original resolution using nearest-neighbor
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcX = Math.floor(x / scaleX);
      const srcY = Math.floor(y / scaleY);
      const srcIdx = (srcY * scaledWidth + srcX) * 4;
      const dstIdx = (y * width + x) * 4;
      
      data[dstIdx] = scaledData[srcIdx];
      data[dstIdx + 1] = scaledData[srcIdx + 1];
      data[dstIdx + 2] = scaledData[srcIdx + 2];
      data[dstIdx + 3] = scaledData[srcIdx + 3];
    }
  }
}

/**
 * Find the nearest color in a palette using Euclidean distance
 */
function findNearestColor(
  r: number,
  g: number,
  b: number,
  palette: [number, number, number][]
): [number, number, number] {
  let minDist = Infinity;
  let nearest = palette[0];

  for (const [pr, pg, pb] of palette) {
    const dist = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
    if (dist < minDist) {
      minDist = dist;
      nearest = [pr, pg, pb];
    }
  }

  return nearest;
}

/**
 * Reduce colors to nearest palette colors without dithering
 */
export function reduceColorsTopalette(
  data: Uint8ClampedArray,
  palette: [number, number, number][]
): void {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const [pr, pg, pb] = findNearestColor(r, g, b, palette);
    data[i] = pr;
    data[i + 1] = pg;
    data[i + 2] = pb;
  }
}
