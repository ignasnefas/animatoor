import { useRef, useState, useCallback } from 'react';
import { AnimationSettings } from '../types';
import { imageDataToASCIICells, renderASCIIToCanvas } from '../utils/asciiRenderer';
import { applyBayerDithering, applyFloydSteinbergDithering, reduceColorsTopalette } from '../utils/dithering';
import { palettes } from '../utils/palettes';
import { applyPixelation } from '../utils/pixelation';

// @ts-ignore - gif.js doesn't have TypeScript definitions
import GIF from 'gif.js';

// Calculate bitrate based on resolution and quality
function calculateBitrate(width: number, height: number, quality: 'good' | 'excellent' | 'maximum', fps: number = 30): number {
  const pixelCount = width * height;
  const baseMultiplier = {
    'good': 0.6,
    'excellent': 1.5,
    'maximum': 3.0,
  }[quality];

  // Calculate bitrate: roughly 0.1-0.3 bits per pixel per second for good quality
  // Adjusted for fps and quality tier
  const bitrate = Math.round(pixelCount * fps * baseMultiplier);
  
  // Minimum and maximum bounds
  return Math.max(500000, Math.min(bitrate, 80000000)); // 0.5Mbps to 80Mbps
}

// Generate frames for GIF encoding
async function generateGifFrames(
  canvas: HTMLCanvasElement,
  settings: AnimationSettings,
  cropX: number,
  cropY: number,
  cropWidth: number,
  cropHeight: number,
): Promise<ImageData[]> {
  const frames: ImageData[] = [];
  const targetDuration = settings.loopDuration * settings.exportLoopCount;
  const targetFrameCount = Math.round(targetDuration * settings.exportFps);
  const frameIntervalMs = 1000 / settings.exportFps;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = settings.exportWidth;
  tempCanvas.height = settings.exportHeight;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) throw new Error('Failed to create canvas context');

  for (let i = 0; i < targetFrameCount; i++) {
    // Draw the current frame
    tempCtx.drawImage(
      canvas,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      settings.exportWidth,
      settings.exportHeight
    );
    
    // Capture frame as ImageData
    const frameData = tempCtx.getImageData(0, 0, settings.exportWidth, settings.exportHeight);
    frames.push(frameData);

    // Wait for next frame interval
    await new Promise(resolve => setTimeout(resolve, frameIntervalMs));
  }

  return frames;
}

// Gif.js-style encoder (simple implementation)
async function encodeGifFromFrames(frames: ImageData[], width: number, height: number, fps: number): Promise<Blob> {
  // This is a simplified version - for production, you'd want to use gif.js library
  // For now, we'll create a simple animated GIF using canvas
  // In a real implementation, you'd use: https://github.com/jnordberg/gif.js
  
  // Create a single frame GIF as fallback (user can use GIF alternatives)
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to create canvas context');

  // Draw first frame
  if (frames.length > 0) {
    ctx.putImageData(frames[0], 0, 0);
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
    }, 'image/gif');
  });
}

export function useVideoExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const abortRef = useRef(false);

  const exportVideo = useCallback(async (
    canvas: HTMLCanvasElement,
    settings: AnimationSettings,
  ) => {
    if (isExporting) return;

    setIsExporting(true);
    setExportProgress(0);
    abortRef.current = false;

    try {
      // Calculate duration ensuring we capture complete loops
      const targetDuration = settings.loopDuration * settings.exportLoopCount;
      
      // Calculate exact frame count needed
      const targetFrameCount = Math.round(targetDuration * settings.exportFps);
      // The exact duration this frame count represents
      const exactDurationMs = (targetFrameCount / settings.exportFps) * 1000;
      const frameIntervalMs = 1000 / settings.exportFps;
      
      // Stop slightly before the end to avoid capturing the boundary frame
      // which could cause a discontinuity when the video loops
      const stopDurationMs = exactDurationMs - (frameIntervalMs * 0.1);

      // Calculate crop dimensions to match export aspect ratio
      const exportAspectRatio = settings.exportWidth / settings.exportHeight;
      const screenWidth = canvas.width;
      const screenHeight = canvas.height;
      const screenAspectRatio = screenWidth / screenHeight;

      let cropWidth, cropHeight, cropX, cropY;

      if (exportAspectRatio > screenAspectRatio) {
        // Export is wider, crop height
        cropWidth = screenWidth;
        cropHeight = screenWidth / exportAspectRatio;
        cropX = 0;
        cropY = (screenHeight - cropHeight) / 2;
      } else {
        // Export is taller, crop width
        cropHeight = screenHeight;
        cropWidth = screenHeight * exportAspectRatio;
        cropX = (screenWidth - cropWidth) / 2;
        cropY = 0;
      }

      // Handle GIF export separately
      if (settings.exportFormat === 'gif') {
        // Generate frames with effects applied
        const frames: ImageData[] = [];
        const targetDuration = settings.loopDuration * settings.exportLoopCount;
        const targetFrameCount = Math.round(targetDuration * settings.exportFps);
        const frameIntervalMs = 1000 / settings.exportFps;

        // Create temp canvas for processing
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = settings.exportWidth;
        tempCanvas.height = settings.exportHeight;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) throw new Error('Failed to create canvas context');

        // Processing canvas for effects
        const processScale = 1.0;
        const processWidth = Math.round(settings.exportWidth * processScale);
        const processHeight = Math.round(settings.exportHeight * processScale);
        const processCanvas = document.createElement('canvas');
        processCanvas.width = processWidth;
        processCanvas.height = processHeight;
        const processCtx = processCanvas.getContext('2d', { willReadFrequently: true });
        if (!processCtx) throw new Error('Failed to create process context');

        for (let i = 0; i < targetFrameCount; i++) {
          setExportProgress((i / targetFrameCount) * 0.5);

          if (abortRef.current) break;

          // Wait for frame interval (simulate animation timing)
          await new Promise(resolve => setTimeout(resolve, frameIntervalMs));

          try {
            if (settings.asciiEnabled) {
              // ASCII processing
              processCtx.drawImage(canvas, cropX, cropY, cropWidth, cropHeight, 0, 0, processWidth, processHeight);
              const imageData = processCtx.getImageData(0, 0, processWidth, processHeight);

              const frame = imageDataToASCIICells(imageData, processWidth, processHeight, {
                charset: settings.asciiCharset,
                resolution: settings.asciiResolution,
                invert: settings.asciiInvert,
                contrast: settings.asciiContrast,
                gamma: settings.asciiGamma,
                colorMode: settings.asciiColorMode,
                textColor: settings.asciiTextColor,
                backgroundColor: settings.backgroundColor,
              });

              renderASCIIToCanvas(tempCtx, frame, settings.exportWidth, settings.exportHeight, {
                charset: settings.asciiCharset,
                resolution: settings.asciiResolution,
                colorMode: settings.asciiColorMode,
                textColor: settings.asciiTextColor,
                backgroundColor: settings.backgroundColor,
                fontSize: settings.asciiFontSize,
                fontWeight: settings.asciiFontWeight,
                textOpacity: settings.asciiOpacity,
                backgroundOpacity: settings.asciiBackgroundOpacity,
                brightnessBoost: settings.asciiBrightnessBoost,
              });
            } else {
              // Capture raw frame - effects applied in post-processing pass below
              tempCtx.drawImage(canvas, cropX, cropY, cropWidth, cropHeight, 0, 0, settings.exportWidth, settings.exportHeight);
            }

            // Capture frame
            const frameData = tempCtx.getImageData(0, 0, settings.exportWidth, settings.exportHeight);
            frames.push(frameData);
          } catch (e) {
            console.warn('Frame capture error:', e);
          }
        }

        // Post-processing pass: apply dithering/palette/pixelation to captured frames offline
        // This avoids temporal drift caused by slow per-frame processing during capture
        if (!settings.asciiEnabled && !abortRef.current && frames.length > 0 &&
            (settings.ditheringEnabled || settings.paletteType !== 'full' || (settings.pixelationEnabled && settings.pixelSize > 1))) {
          for (let i = 0; i < frames.length; i++) {
            if (abortRef.current) break;
            setExportProgress(0.5 + (i / frames.length) * 0.3);

            // Put raw frame on temp canvas, downscale to process canvas
            tempCtx.putImageData(frames[i], 0, 0);
            processCtx.drawImage(tempCanvas, 0, 0, settings.exportWidth, settings.exportHeight, 0, 0, processWidth, processHeight);

            if (settings.ditheringEnabled || settings.paletteType !== 'full') {
              const imageData = processCtx.getImageData(0, 0, processWidth, processHeight);
              const palette = palettes[settings.paletteType].colors;

              if (settings.ditheringEnabled) {
                if (settings.ditheringType === 'bayer') {
                  applyBayerDithering(imageData.data, processWidth, processHeight, palette, settings.ditheringIntensity, settings.ditheringResolution);
                } else {
                  applyFloydSteinbergDithering(imageData.data, processWidth, processHeight, palette, settings.ditheringIntensity, settings.ditheringResolution);
                }
              } else {
                reduceColorsTopalette(imageData.data, palette);
              }

              processCtx.putImageData(imageData, 0, 0);
            }

            if (settings.pixelationEnabled && settings.pixelSize > 1) {
              applyPixelation(processCtx, processCanvas, settings.pixelSize);
            }

            // Upscale processed frame to export size and replace in array
            tempCtx.drawImage(processCanvas, 0, 0, processWidth, processHeight, 0, 0, settings.exportWidth, settings.exportHeight);
            frames[i] = tempCtx.getImageData(0, 0, settings.exportWidth, settings.exportHeight);

            // Yield to UI thread periodically
            if (i % 5 === 0) {
              await new Promise(resolve => setTimeout(resolve, 0));
            }
          }
        }

        if (!abortRef.current && frames.length > 0) {
          // Create GIF using gif.js
          const gif = new GIF({
            workers: 2,
            quality: 10,
            width: settings.exportWidth,
            height: settings.exportHeight,
            workerScript: '/gif.worker.js'
          });

          frames.forEach(frame => {
            const canvas = document.createElement('canvas');
            canvas.width = settings.exportWidth;
            canvas.height = settings.exportHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.putImageData(frame, 0, 0);
              gif.addFrame(canvas, { delay: 1000 / settings.exportFps });
            }
          });

          gif.on('finished', (blob: Blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `loopforge-${settings.animationType}-${Date.now()}.gif`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setIsExporting(false);
            setExportProgress(0);
          });

          gif.on('progress', (p: number) => {
            setExportProgress(0.8 + p * 0.2);
          });

          gif.render();
        } else {
          setIsExporting(false);
          setExportProgress(0);
        }

        return;
      }

      // Handle video export with post-processing effects (dithering, palette, pixelation)
      // Uses 3-phase approach: capture raw → post-process offline → playback+record
      // This prevents frame drops caused by expensive per-frame dithering during real-time recording
      const needsVideoPostProcessing = !settings.asciiEnabled &&
        (settings.ditheringEnabled || settings.paletteType !== 'full' || (settings.pixelationEnabled && settings.pixelSize > 1));

      if (needsVideoPostProcessing) {
        // Phase 1: Capture raw frames from the live animation canvas (fast, no effects)
        const rawFrames: ImageData[] = [];
        const capCanvas = document.createElement('canvas');
        capCanvas.width = settings.exportWidth;
        capCanvas.height = settings.exportHeight;
        const capCtx = capCanvas.getContext('2d', { willReadFrequently: true });
        if (!capCtx) throw new Error('Failed to create capture context');

        await new Promise<void>((resolve) => {
          let capturedCount = 0;
          const captureStart = Date.now();
          const captureLoop = setInterval(() => {
            const elapsed = Date.now() - captureStart;
            const expectedFrame = Math.floor((elapsed / 1000) * settings.exportFps);

            if (expectedFrame <= capturedCount && rawFrames.length > 0) return;
            capturedCount = expectedFrame;

            if (abortRef.current || elapsed >= stopDurationMs) {
              clearInterval(captureLoop);
              resolve();
              return;
            }

            try {
              capCtx.drawImage(canvas, cropX, cropY, cropWidth, cropHeight, 0, 0, settings.exportWidth, settings.exportHeight);
              rawFrames.push(capCtx.getImageData(0, 0, settings.exportWidth, settings.exportHeight));
            } catch (e) {
              console.warn('Raw frame capture error:', e);
            }

            setExportProgress((elapsed / stopDurationMs) * 0.3);
          }, Math.max(1, frameIntervalMs / 2));
        });

        if (abortRef.current || rawFrames.length === 0) return;

        // Phase 2: Apply dithering/palette/pixelation to each frame at full resolution (offline, no time pressure)
        const ppProcessCanvas = document.createElement('canvas');
        ppProcessCanvas.width = settings.exportWidth;
        ppProcessCanvas.height = settings.exportHeight;
        const ppProcessCtx = ppProcessCanvas.getContext('2d', { willReadFrequently: true });

        if (!ppProcessCtx) throw new Error('Failed to create processing context');

        for (let i = 0; i < rawFrames.length; i++) {
          if (abortRef.current) break;
          setExportProgress(0.3 + (i / rawFrames.length) * 0.3);

          // Apply dithering/palette effects directly at full resolution
          if (settings.ditheringEnabled || settings.paletteType !== 'full') {
            const imageData = rawFrames[i];
            const palette = palettes[settings.paletteType].colors;

            if (settings.ditheringEnabled) {
              if (settings.ditheringType === 'bayer') {
                applyBayerDithering(imageData.data, settings.exportWidth, settings.exportHeight, palette, settings.ditheringIntensity, settings.ditheringResolution);
              } else {
                applyFloydSteinbergDithering(imageData.data, settings.exportWidth, settings.exportHeight, palette, settings.ditheringIntensity, settings.ditheringResolution);
              }
            } else {
              reduceColorsTopalette(imageData.data, palette);
            }

            rawFrames[i] = imageData;
          }

          // Apply pixelation if enabled
          if (settings.pixelationEnabled && settings.pixelSize > 1) {
            ppProcessCtx.putImageData(rawFrames[i], 0, 0);
            applyPixelation(ppProcessCtx, ppProcessCanvas, settings.pixelSize);
            rawFrames[i] = ppProcessCtx.getImageData(0, 0, settings.exportWidth, settings.exportHeight);
          }

          // Yield to UI thread periodically
          if (i % 5 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }

        if (abortRef.current) return;

        // Phase 3: Play back processed frames and record with MediaRecorder
        const ppCompositeCanvas = document.createElement('canvas');
        ppCompositeCanvas.width = settings.exportWidth;
        ppCompositeCanvas.height = settings.exportHeight;
        const ppCompCtx = ppCompositeCanvas.getContext('2d');
        if (!ppCompCtx) throw new Error('Failed to create composite context');

        // Draw first frame immediately
        if (rawFrames.length > 0) {
          ppCompCtx.putImageData(rawFrames[0], 0, 0);
        }

        const ppRecordingStream = ppCompositeCanvas.captureStream(settings.exportFps);

        // Select MIME type and codec
        let ppMimeType: string;
        let ppVideoBitsPerSecond: number;

        if (settings.exportFormat === 'mp4') {
          const mp4Types = [
            'video/mp4;codecs=avc1',
            'video/mp4;codecs=avc1.42E01E',
            'video/mp4;codecs=h264',
            'video/mp4',
          ];
          ppMimeType = mp4Types.find(type => MediaRecorder.isTypeSupported(type)) || 'video/webm';
          ppVideoBitsPerSecond = calculateBitrate(settings.exportWidth, settings.exportHeight, settings.exportQuality, settings.exportFps);
        } else {
          const webmTypes = [
            'video/webm;codecs=vp9',
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8',
            'video/webm',
          ];
          ppMimeType = webmTypes.find(type => MediaRecorder.isTypeSupported(type)) || 'video/webm';
          ppVideoBitsPerSecond = calculateBitrate(settings.exportWidth, settings.exportHeight, settings.exportQuality, settings.exportFps);
        }

        const ppMediaRecorder = new MediaRecorder(ppRecordingStream, {
          mimeType: ppMimeType,
          videoBitsPerSecond: ppVideoBitsPerSecond,
        });

        const ppChunks: Blob[] = [];
        ppMediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) ppChunks.push(e.data);
        };

        ppMediaRecorder.start(100);

        // Play back pre-processed frames at correct FPS with precise timing
        const startPlaybackTime = Date.now();
        let playbackIndex = 1; // Frame 0 already drawn
        
        const scheduleFrame = (index: number) => {
          if (index >= rawFrames.length || abortRef.current) {
            // Small delay to ensure last frame is captured by MediaRecorder
            setTimeout(() => ppMediaRecorder.stop(), 100);
            return;
          }
          
          ppCompCtx.putImageData(rawFrames[index], 0, 0);
          setExportProgress(0.6 + (index / rawFrames.length) * 0.4);
          
          // Schedule next frame
          const nextTime = startPlaybackTime + (index + 1) * frameIntervalMs;
          const delay = Math.max(0, nextTime - Date.now());
          setTimeout(() => scheduleFrame(index + 1), delay);
        };
        
        // Start playback
        await new Promise<void>((resolve) => {
          scheduleFrame(playbackIndex);

          ppMediaRecorder.onstop = () => {
            if (!abortRef.current && ppChunks.length > 0) {
              const blob = new Blob(ppChunks, { type: ppMimeType });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              const formatExt = settings.exportFormat === 'mp4' ? 'mp4' : 'webm';
              a.download = `loopforge-${settings.animationType}-${Date.now()}.${formatExt}`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }
            resolve();
          };
        });

        return;
      }

      let recordingCanvas = canvas;
      let recordingStream: MediaStream;

      // If ASCII is enabled, capture and process frames manually
      if (settings.asciiEnabled) {
        const compositeCanvas = document.createElement('canvas');
        compositeCanvas.width = settings.exportWidth;
        compositeCanvas.height = settings.exportHeight;
        
        recordingCanvas = compositeCanvas;
        recordingStream = compositeCanvas.captureStream(settings.exportFps);

        // Temp canvas to read WebGL pixels
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = cropWidth;
        tempCanvas.height = cropHeight;

        let capturedFrames = 0;
        const recordingStartTime = Date.now();
        
        const compositeCaptureLoop = setInterval(() => {
          // Calculate which frame we should be on based on elapsed time
          const elapsed = Date.now() - recordingStartTime;
          const currentFrameNumber = Math.floor((elapsed / 1000) * settings.exportFps);

          // Only capture if we haven't already captured this frame
          if (currentFrameNumber <= capturedFrames) return;
          capturedFrames = currentFrameNumber;

          const ctx = compositeCanvas.getContext('2d');
          const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
          if (!ctx || !tempCtx) return;

          try {
            // Copy cropped WebGL pixels to temp canvas
            tempCtx.drawImage(canvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
            const imageData = tempCtx.getImageData(0, 0, cropWidth, cropHeight);

            // Convert to ASCII cell grid
            const frame = imageDataToASCIICells(imageData, cropWidth, cropHeight, {
              charset: settings.asciiCharset,
              resolution: settings.asciiResolution,
              invert: settings.asciiInvert,
              contrast: settings.asciiContrast,
              gamma: settings.asciiGamma,
              colorMode: settings.asciiColorMode,
              textColor: settings.asciiTextColor,
              backgroundColor: settings.backgroundColor,
            });

            // Render ASCII to the composite canvas
            renderASCIIToCanvas(ctx, frame, compositeCanvas.width, compositeCanvas.height, {
              charset: settings.asciiCharset,
              resolution: settings.asciiResolution,
              colorMode: settings.asciiColorMode,
              textColor: settings.asciiTextColor,
              backgroundColor: settings.backgroundColor,
              fontSize: settings.asciiFontSize,
              fontWeight: settings.asciiFontWeight,
              textOpacity: settings.asciiOpacity,
              backgroundOpacity: settings.asciiBackgroundOpacity,
              brightnessBoost: settings.asciiBrightnessBoost,
            });
          } catch (e) {
            // Silently handle errors
          }
        }, Math.max(1, frameIntervalMs / 2)); // Check frequently for frames

        // Store it for cleanup
        (recordingCanvas as any).__asciiCaptureInterval = compositeCaptureLoop;
      } else {
        // For non-ASCII, create composite canvas with export dimensions and crop
        const compositeCanvas = document.createElement('canvas');
        compositeCanvas.width = settings.exportWidth;
        compositeCanvas.height = settings.exportHeight;
        
        recordingCanvas = compositeCanvas;
        recordingStream = compositeCanvas.captureStream(settings.exportFps);

        // Process at full resolution for better quality
        const processScale = 1.0;
        const processWidth = Math.round(settings.exportWidth * processScale);
        const processHeight = Math.round(settings.exportHeight * processScale);
        
        const processCanvas = document.createElement('canvas');
        processCanvas.width = processWidth;
        processCanvas.height = processHeight;

        let capturedFrames = 0;
        const recordingStartTime = Date.now();
        
        const compositeCaptureLoop = setInterval(() => {
          // Calculate which frame we should be on based on elapsed time
          const elapsed = Date.now() - recordingStartTime;
          const currentFrameNumber = Math.floor((elapsed / 1000) * settings.exportFps);

          // Only capture if we haven't already captured this frame
          if (currentFrameNumber <= capturedFrames) return;
          capturedFrames = currentFrameNumber;

          const ctx = compositeCanvas.getContext('2d');
          const processCtx = processCanvas.getContext('2d', { willReadFrequently: true });
          if (!ctx || !processCtx) return;

          try {
            // Draw cropped WebGL directly to processing canvas (auto-scales)
            processCtx.drawImage(canvas, cropX, cropY, cropWidth, cropHeight, 0, 0, processWidth, processHeight);
            
            // Apply dithering/palette effects on downscaled image
            if (settings.ditheringEnabled || (settings.paletteType !== 'full')) {
              const imageData = processCtx.getImageData(0, 0, processWidth, processHeight);
              const palette = palettes[settings.paletteType].colors;

              // Use preview resolution directly for dithering (no further reduction needed)
              if (settings.ditheringEnabled) {
                if (settings.ditheringType === 'bayer') {
                  applyBayerDithering(imageData.data, processWidth, processHeight, palette, settings.ditheringIntensity, settings.ditheringResolution);
                } else {
                  applyFloydSteinbergDithering(imageData.data, processWidth, processHeight, palette, settings.ditheringIntensity, settings.ditheringResolution);
                }
              } else {
                // Just reduce colors without dithering
                reduceColorsTopalette(imageData.data, palette);
              }

              // Put modified image data back
              processCtx.putImageData(imageData, 0, 0);
            }

            // Apply pixelation on top if enabled
            if (settings.pixelationEnabled && settings.pixelSize > 1) {
              applyPixelation(processCtx, processCanvas, settings.pixelSize);
            }

            // Draw upscaled processed image to composite canvas
            ctx.drawImage(processCanvas, 0, 0, processWidth, processHeight, 0, 0, settings.exportWidth, settings.exportHeight);
          } catch (e) {
            // Silently handle errors
          }
        }, Math.max(1, frameIntervalMs / 2)); // Check frequently for frames

        // Store it for cleanup
        (recordingCanvas as any).__compositeCaptureInterval = compositeCaptureLoop;
      }

      // Select MIME type and codec based on format and quality
      let mimeType: string;
      let videoBitsPerSecond: number;

      if (settings.exportFormat === 'mp4') {
        // Try H.264 codec in MP4 container (best compatibility and compression)
        const mp4Types = [
          'video/mp4;codecs=avc1',
          'video/mp4;codecs=avc1.42E01E',
          'video/mp4;codecs=h264',
          'video/mp4',
        ];
        
        mimeType = mp4Types.find(type => MediaRecorder.isTypeSupported(type)) || 'video/webm';
        videoBitsPerSecond = calculateBitrate(settings.exportWidth, settings.exportHeight, settings.exportQuality, settings.exportFps);
      } else {
        // WebM with VP9 or VP8
        const webmTypes = [
          'video/webm;codecs=vp9',
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp8',
          'video/webm',
        ];
        
        mimeType = webmTypes.find(type => MediaRecorder.isTypeSupported(type)) || 'video/webm';
        videoBitsPerSecond = calculateBitrate(settings.exportWidth, settings.exportHeight, settings.exportQuality, settings.exportFps);
      }
      
      const mediaRecorder = new MediaRecorder(recordingStream, {
        mimeType,
        videoBitsPerSecond,
        audioBitsPerSecond: 128000,
      });

      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      const startTime = Date.now();

      mediaRecorder.start(100); // Collect data every 100ms

      // More precise frame-based stopping
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / exactDurationMs, 1);
        setExportProgress(progress);

        // Stop when we've elapsed our stop duration (slightly before the loop boundary)
        if (elapsed >= stopDurationMs || abortRef.current) {
          clearInterval(progressInterval);
          mediaRecorder.stop();
        }
      }, Math.max(5, frameIntervalMs / 2)); // Check at least every half-frame interval

      // Wait for recording to complete
      await new Promise<void>((resolve) => {
        mediaRecorder.onstop = () => {
          clearInterval(progressInterval);

          // Clean up capture intervals if they exist
          if ((recordingCanvas as any).__asciiCaptureInterval) {
            clearInterval((recordingCanvas as any).__asciiCaptureInterval);
          }
          if ((recordingCanvas as any).__compositeCaptureInterval) {
            clearInterval((recordingCanvas as any).__compositeCaptureInterval);
          }

          if (!abortRef.current && chunks.length > 0) {
            const blob = new Blob(chunks, { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            const formatExt = settings.exportFormat === 'mp4' ? 'mp4' : 'webm';
            a.download = `loopforge-${settings.animationType}-${Date.now()}.${formatExt}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }

          resolve();
        };
      });

    } catch (error) {
      console.error('Export failed:', error);
      alert(`Export failed: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  }, [isExporting]);

  const cancelExport = useCallback(() => {
    abortRef.current = true;
  }, []);

  return { isExporting, exportProgress, exportVideo, cancelExport };
}

