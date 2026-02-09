/**
 * Performance Optimization Utilities
 * Provides utilities for efficient rendering, caching, and memory management
 */

/**
 * Request animation frame throttling
 */
export class RAFThrottler {
  private callbacks: Set<FrameRequestCallback> = new Set();
  private rafId: number | null = null;

  schedule(callback: FrameRequestCallback): void {
    this.callbacks.add(callback);
    if (!this.rafId) {
      this.rafId = requestAnimationFrame((time) => {
        const callbacks = Array.from(this.callbacks);
        this.callbacks.clear();
        this.rafId = null;
        callbacks.forEach(cb => cb(time));
      });
    }
  }

  cancel(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.callbacks.clear();
  }
}

/**
 * LRU Cache for expensive computations
 */
export class LRUCache<K, V> {
  private cache: Map<K, V>;
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    // If key exists, delete it first
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    // If at capacity, remove least recently used (first item)
    else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  get size(): number {
    return this.cache.size;
  }
}

/**
 * Efficient image data sampling for reduced bandwidth/processing
 */
export class ImageSampler {
  /**
   * Downsample image data by averaging pixels
   */
  static downsample(
    imageData: ImageData,
    scale: number
  ): ImageData {
    if (scale >= 1) return imageData;

    const srcWidth = imageData.width;
    const srcHeight = imageData.height;
    const dstWidth = Math.floor(srcWidth * scale);
    const dstHeight = Math.floor(srcHeight * scale);

    const srcData = imageData.data;
    const dstData = new Uint8ClampedArray(dstWidth * dstHeight * 4);

    const stepX = Math.floor(1 / scale);
    const stepY = Math.floor(1 / scale);

    for (let y = 0; y < dstHeight; y++) {
      for (let x = 0; x < dstWidth; x++) {
        const srcX = x * stepX;
        const srcY = y * stepY;
        const srcIdx = (srcY * srcWidth + srcX) * 4;

        const dstIdx = (y * dstWidth + x) * 4;
        dstData[dstIdx] = srcData[srcIdx];
        dstData[dstIdx + 1] = srcData[srcIdx + 1];
        dstData[dstIdx + 2] = srcData[srcIdx + 2];
        dstData[dstIdx + 3] = srcData[srcIdx + 3];
      }
    }

    return new ImageData(dstData, dstWidth, dstHeight);
  }

  /**
   * Sample every Nth pixel for faster analysis
   */
  static samplePixels(
    imageData: ImageData,
    step: number = 4
  ): Uint8ClampedArray {
    const data = imageData.data;
    const sampled = new Uint8ClampedArray(Math.ceil(data.length / (4 * step * step)) * 4);

    let sampledIdx = 0;
    for (let i = 0; i < data.length; i += step * 4) {
      sampled[sampledIdx++] = data[i];
      sampled[sampledIdx++] = data[i + 1];
      sampled[sampledIdx++] = data[i + 2];
      sampled[sampledIdx++] = data[i + 3];
    }

    return sampled;
  }
}

/**
 * Canvas utilities for efficient rendering
 */
export class CanvasUtils {
  private static contextCache = new Map<HTMLCanvasElement, CanvasRenderingContext2D>();

  /**
   * Get or create a canvas context with caching
   */
  static getContext2D(
    canvas: HTMLCanvasElement,
    attributes?: CanvasRenderingContext2DSettings
  ): CanvasRenderingContext2D {
    let ctx = this.contextCache.get(canvas);
    if (!ctx) {
      ctx = canvas.getContext('2d', attributes || { willReadFrequently: true })!;
      this.contextCache.set(canvas, ctx);
    }
    return ctx;
  }

  /**
   * Create an offscreen canvas with optimal settings
   */
  static createOffscreenCanvas(
    width: number,
    height: number
  ): OffscreenCanvas {
    return new OffscreenCanvas(width, height);
  }

  /**
   * Clear a rectangle efficiently
   */
  static clearRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    ctx.clearRect(x, y, width, height);
  }

  /**
   * Fast copy from one canvas to another
   */
  static copyCanvas(
    source: HTMLCanvasElement | OffscreenCanvas,
    destination: CanvasRenderingContext2D,
    x: number = 0,
    y: number = 0
  ): void {
    destination.drawImage(source, x, y);
  }

  /**
   * Clear the context cache (call after rendering is done)
   */
  static clearCache(): void {
    this.contextCache.clear();
  }
}

/**
 * Memory-efficient calculation helpers
 */
export const MathUtils = {
  /**
   * Fast integer square root (Newton's method)
   */
  isqrt(n: number): number {
    if (n < 2) return n;
    let x = n;
    let y = (x + 1) >> 1;
    while (y < x) {
      x = y;
      y = (x + Math.floor(n / x)) >> 1;
    }
    return x;
  },

  /**
   * Fast color distance (euclidean)
   */
  colorDistance(
    r1: number, g1: number, b1: number,
    r2: number, g2: number, b2: number
  ): number {
    const dr = r1 - r2;
    const dg = g1 - g2;
    const db = b1 - b2;
    return dr * dr + dg * dg + db * db;
  },

  /**
   * Normalize value to 0-1 range
   */
  normalize(value: number, min: number, max: number): number {
    return (value - min) / (max - min);
  },

  /**
   * Linear interpolation
   */
  lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  },

  /**
   * Clamp value between min and max
   */
  clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  },
};

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private sampleSize: number;

  constructor(sampleSize: number = 60) {
    this.sampleSize = sampleSize;
  }

  record(label: string, value: number): void {
    if (!this.metrics.has(label)) {
      this.metrics.set(label, []);
    }
    const samples = this.metrics.get(label)!;
    samples.push(value);
    if (samples.length > this.sampleSize) {
      samples.shift();
    }
  }

  getStats(label: string): { mean: number; min: number; max: number } | null {
    const samples = this.metrics.get(label);
    if (!samples || samples.length === 0) return null;

    const sum = samples.reduce((a, b) => a + b, 0);
    const mean = sum / samples.length;
    const min = Math.min(...samples);
    const max = Math.max(...samples);

    return { mean, min, max };
  }

  clear(label?: string): void {
    if (label) {
      this.metrics.delete(label);
    } else {
      this.metrics.clear();
    }
  }
}

export default {
  RAFThrottler,
  LRUCache,
  ImageSampler,
  CanvasUtils,
  MathUtils,
  PerformanceMonitor,
};
