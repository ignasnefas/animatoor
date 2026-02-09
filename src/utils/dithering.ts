/**
 * Dithering algorithms for retro visual effects
 */

export type DitheringType = 'none' | 'bayer' | 'floydSteinberg' | 'ordered';

/**
 * Bayer matrix for ordered dithering
 */
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
  const ditherScale = 255 * intensity / 64;

  // Single pass with optimized math
  for (let i = 0; i < data.length; i += 4) {
    const pixelIndex = i / 4;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);

    const mx = x & 7; // Bitwise AND faster than modulo
    const my = y & 7;
    const dither = (matrix[my][mx] - 32) * ditherScale;

    data[i] = Math.max(0, Math.min(255, data[i] + dither)) | 0;
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + dither)) | 0;
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + dither)) | 0;

    // Use cached color lookup
    const [pr, pg, pb] = findNearestColor(data[i], data[i + 1], data[i + 2], palette);
    data[i] = pr;
    data[i + 1] = pg;
    data[i + 2] = pb;
  }
}

/**
 * Apply Floyd-Steinberg dithering (diffusion-based)
 * Optimized with reduced allocations
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

  // Use two rows of error buffers (more memory efficient than full copy)
  const errBuffer = new Float32Array((width + 2) * 2 * 3);
  let currentRow = 0;

  for (let y = 0; y < height; y++) {
    const nextRow = 1 - currentRow;
    const currentBuf = errBuffer.subarray(currentRow * (width + 2) * 3, (currentRow + 1) * (width + 2) * 3);
    const nextBuf = errBuffer.subarray(nextRow * (width + 2) * 3, nextRow + 1 * (width + 2) * 3);
    
    // Clear next row
    nextBuf.fill(0);

    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const errIdx = (x + 1) * 3;

      // Apply accumulated error
      let r = Math.max(0, Math.min(255, data[idx] + currentBuf[errIdx] * intensity));
      let g = Math.max(0, Math.min(255, data[idx + 1] + currentBuf[errIdx + 1] * intensity));
      let b = Math.max(0, Math.min(255, data[idx + 2] + currentBuf[errIdx + 2] * intensity));

      // Find nearest palette color
      const [pr, pg, pb] = findNearestColor(r | 0, g | 0, b | 0, palette);

      // Calculate error
      const errR = (r - pr) / 16;
      const errG = (g - pg) / 16;
      const errB = (b - pb) / 16;

      // Set pixel
      data[idx] = pr;
      data[idx + 1] = pg;
      data[idx + 2] = pb;

      // Distribute error (Floyd-Steinberg weights: 7/16, 3/16, 5/16, 1/16)
      if (x < width - 1) {
        currentBuf[errIdx + 3] += errR * 7;
        currentBuf[errIdx + 4] += errG * 7;
        currentBuf[errIdx + 5] += errB * 7;
      }
      
      if (y < height - 1) {
        if (x > 0) {
          nextBuf[errIdx] += errR * 3;
          nextBuf[errIdx + 1] += errG * 3;
          nextBuf[errIdx + 2] += errB * 3;
        }
        nextBuf[errIdx + 3] += errR * 5;
        nextBuf[errIdx + 4] += errG * 5;
        nextBuf[errIdx + 5] += errB * 5;
        
        if (x < width - 1) {
          nextBuf[errIdx + 6] += errR;
          nextBuf[errIdx + 7] += errG;
          nextBuf[errIdx + 8] += errB;
        }
      }
    }
    
    currentRow = nextRow;
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

// Cache for nearest color lookups - LRU cache for frequently used colors
const colorCache = new Map<number, [number, number, number]>();
const MAX_CACHE_SIZE = 8192;

/**
 * Find the nearest color in a palette using Euclidean distance with caching
 */
function findNearestColor(
  r: number,
  g: number,
  b: number,
  palette: [number, number, number][]
): [number, number, number] {
  // Create cache key from RGB values
  const key = (r << 16) | (g << 8) | b;
  
  // Check cache first (huge performance boost)
  if (colorCache.has(key)) {
    return colorCache.get(key)!;
  }

  let minDist = Infinity;
  let nearest = palette[0];

  // Hardcoded palette optimization - cache precomputed squared values
  for (const [pr, pg, pb] of palette) {
    const dr = r - pr;
    const dg = g - pg;
    const db = b - pb;
    const dist = dr * dr + dg * dg + db * db;
    
    if (dist < minDist) {
      minDist = dist;
      nearest = [pr, pg, pb];
    }
  }

  // Store in cache with LRU eviction
  if (colorCache.size >= MAX_CACHE_SIZE) {
    const firstKey = colorCache.keys().next().value;
    if (firstKey !== undefined) colorCache.delete(firstKey);
  }
  colorCache.set(key, nearest);

  return nearest;
}

/**
 * Reduce colors to nearest palette colors without dithering
 * Optimized with cached color lookups
 */
export function reduceColorsTopalette(
  data: Uint8ClampedArray,
  palette: [number, number, number][]
): void {
  // Clear cache at start of frame for consistency
  colorCache.clear();
  
  // Process in chunks for better cache locality
  const chunkSize = Math.min(64, data.length / 4);
  
  for (let i = 0; i < data.length; i += 4 * chunkSize) {
    for (let j = 0; j < chunkSize && i + j * 4 < data.length; j++) {
      const idx = i + j * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const [pr, pg, pb] = findNearestColor(r, g, b, palette);
      data[idx] = pr;
      data[idx + 1] = pg;
      data[idx + 2] = pb;
    }
  }
}
