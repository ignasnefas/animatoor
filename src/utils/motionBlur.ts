/**
 * Motion Blur Utilities
 * Applies motion blur effect to canvas frames
 */

interface MotionBlurOptions {
  amount: number; // 0-1
  sampleCount?: number; // Number of previous frames to blend
}

/**
 * Applies motion blur to a canvas by blending with previous frames
 */
export function applyMotionBlur(
  currentCanvas: HTMLCanvasElement,
  previousFrames: ImageData[],
  options: MotionBlurOptions
): ImageData {
  const ctx = currentCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Could not get 2D context');
  }
  
  const width = currentCanvas.width;
  const height = currentCanvas.height;
  const currentImageData = ctx.getImageData(0, 0, width, height);
  const data = new Uint8ClampedArray(currentImageData.data);
  
  const sampleCount = Math.min(options.sampleCount || 3, previousFrames.length);
  if (sampleCount === 0) return currentImageData;
  
  const totalFrames = sampleCount + 1;
  const pixelCount = width * height;
  
  // Blend current frame with previous frames
  for (let i = 0; i < previousFrames.length && i < sampleCount; i++) {
    const prevData = previousFrames[previousFrames.length - 1 - i].data;
    const weight = (options.amount / totalFrames) * (1 - i / sampleCount);
    
    for (let j = 0; j < pixelCount * 4; j += 4) {
      data[j] = Math.round(data[j] * (1 - weight) + prevData[j] * weight);
      data[j + 1] = Math.round(data[j + 1] * (1 - weight) + prevData[j + 1] * weight);
      data[j + 2] = Math.round(data[j + 2] * (1 - weight) + prevData[j + 2] * weight);
      data[j + 3] = Math.round(data[j + 3] * (1 - weight) + prevData[j + 3] * weight);
    }
  }
  
  return new ImageData(data, width, height);
}

/**
 * Accumulates frames for motion blur effect
 */
export class MotionBlurAccumulator {
  private frames: ImageData[] = [];
  private readonly maxFrames: number;
  
  constructor(maxFrames: number = 5) {
    this.maxFrames = Math.max(1, maxFrames);
  }
  
  addFrame(imageData: ImageData): void {
    this.frames.push(imageData);
    if (this.frames.length > this.maxFrames) {
      this.frames.shift();
    }
  }
  
  getFrames(): ImageData[] {
    return [...this.frames];
  }
  
  clear(): void {
    this.frames = [];
  }
  
  getBlurredFrame(currentCanvas: HTMLCanvasElement, amount: number): ImageData {
    if (this.frames.length === 0) {
      const ctx = currentCanvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Could not get 2D context');
      return ctx.getImageData(0, 0, currentCanvas.width, currentCanvas.height);
    }
    
    return applyMotionBlur(currentCanvas, this.frames, {
      amount,
      sampleCount: this.frames.length,
    });
  }
}
