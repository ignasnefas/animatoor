import { useRef, forwardRef, useImperativeHandle, useEffect, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { AnimatedShapes } from './AnimatedShapes';
import { AnimationSettings } from '../types';
import { imageDataToASCIICells, renderASCIIToCanvas } from '../utils/asciiRenderer';

interface SceneLightsProps {
  settings: AnimationSettings;
}

function SceneLights({ settings }: SceneLightsProps) {
  const color1 = new THREE.Color(settings.shapeColor);
  const color2 = new THREE.Color(settings.shapeColor2);

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} color={color1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color={color2} />
      <pointLight position={[0, 10, -10]} intensity={0.3} color="#ffffff" />
      <directionalLight position={[5, 5, 5]} intensity={0.5} />
    </>
  );
}

function BackgroundPlane({ settings }: { settings: AnimationSettings }) {
  const { scene } = useThree();

  useEffect(() => {
    if (settings.backgroundGradient) {
      scene.background = new THREE.Color(settings.backgroundColor);
    } else {
      scene.background = new THREE.Color(settings.backgroundColor);
    }
  }, [settings.backgroundColor, settings.backgroundGradient, scene]);

  return null;
}

interface CameraControllerProps {
  settings: AnimationSettings;
}

function CameraController({ settings }: CameraControllerProps) {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.setLength(settings.cameraDistance);
  }, [settings.cameraDistance, camera]);

  useFrame(({ clock }) => {
    if (settings.cameraAutoRotate) {
      const t = clock.getElapsedTime();
      let loopT = (t % settings.loopDuration) / settings.loopDuration;
      
      // Ensure loopT stays in [0, 1) to prevent floating point precision issues
      if (loopT >= 0.9999999) {
        loopT = 0;
      } else if (loopT < 0) {
        loopT = 0;
      }
      
      // Apply camera rotation speed as a multiplier
      const angle = loopT * Math.PI * 2 * settings.cameraAutoRotateSpeed * 0.5;
      camera.position.x = Math.cos(angle) * settings.cameraDistance;
      camera.position.z = Math.sin(angle) * settings.cameraDistance;
      camera.lookAt(0, 0, 0);
    }
  });

  return null;
}

export interface SceneHandle {
  getCanvas: () => HTMLCanvasElement | null;
}

interface SceneProps {
  settings: AnimationSettings;
}

/**
 * ASCII Effect Component — completely replaces the 3D canvas with ASCII art.
 * Reads pixels from the WebGL canvas each frame and renders colored ASCII
 * characters on a separate 2D canvas that covers the whole viewport.
 */
function ASCIIEffect({ glCanvas, settings }: { glCanvas: HTMLCanvasElement | null; settings: AnimationSettings }) {
  const asciiCanvasRef = useRef<HTMLCanvasElement>(null);
  const tempCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);

  const render = useCallback(() => {
    if (!glCanvas || !asciiCanvasRef.current || !settings.asciiEnabled) return;

    const asciiCanvas = asciiCanvasRef.current;
    const w = glCanvas.width;
    const h = glCanvas.height;

    // Ensure ascii canvas matches the GL canvas size
    if (asciiCanvas.width !== w || asciiCanvas.height !== h) {
      asciiCanvas.width = w;
      asciiCanvas.height = h;
    }

    // Temp 2D canvas to read WebGL pixels
    if (!tempCanvasRef.current) {
      tempCanvasRef.current = document.createElement('canvas');
    }
    const temp = tempCanvasRef.current;
    if (temp.width !== w || temp.height !== h) {
      temp.width = w;
      temp.height = h;
    }

    const tempCtx = temp.getContext('2d', { willReadFrequently: true });
    const asciiCtx = asciiCanvas.getContext('2d');
    if (!tempCtx || !asciiCtx) return;

    try {
      // Copy WebGL pixels to temp canvas
      tempCtx.drawImage(glCanvas, 0, 0);
      const imageData = tempCtx.getImageData(0, 0, w, h);

      // Convert to ASCII cell grid
      const frame = imageDataToASCIICells(imageData, w, h, {
        charset: settings.asciiCharset,
        resolution: settings.asciiResolution,
        invert: settings.asciiInvert,
        contrast: settings.asciiContrast,
        colorMode: settings.asciiColorMode,
        textColor: settings.asciiTextColor,
        backgroundColor: settings.backgroundColor,
      });

      // Render ASCII characters to the canvas
      renderASCIIToCanvas(asciiCtx, frame, w, h, {
        charset: settings.asciiCharset,
        resolution: settings.asciiResolution,
        colorMode: settings.asciiColorMode,
        textColor: settings.asciiTextColor,
        backgroundColor: settings.backgroundColor,
        fontSize: settings.asciiFontSize,
        textOpacity: settings.asciiOpacity,
        backgroundOpacity: settings.asciiBackgroundOpacity,
      });
    } catch (_) {
      // silently fail if canvas not ready
    }

    rafRef.current = requestAnimationFrame(render);
  }, [glCanvas, settings]);

  useEffect(() => {
    if (!settings.asciiEnabled) {
      cancelAnimationFrame(rafRef.current);
      return;
    }
    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, [settings.asciiEnabled, render]);

  if (!settings.asciiEnabled) return null;

  return (
    <canvas
      ref={asciiCanvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ zIndex: 10 }}
    />
  );
}

export const Scene = forwardRef<SceneHandle, SceneProps>(function Scene({ settings }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
  }));

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <Canvas
        ref={canvasRef}
        camera={{ position: [0, 2, settings.cameraDistance], fov: 50 }}
        gl={{
          preserveDrawingBuffer: true,
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]}
        style={{ background: settings.backgroundColor }}
      >
        <BackgroundPlane settings={settings} />
        <CameraController settings={settings} />
        <SceneLights settings={settings} />
        <AnimatedShapes settings={settings} />
        <Environment preset="city" environmentIntensity={0.2} />
        {!settings.cameraAutoRotate && (
          <OrbitControls
            enablePan={false}
            enableZoom={true}
            minDistance={2}
            maxDistance={20}
          />
        )}
      </Canvas>
      <ASCIIEffect glCanvas={canvasRef.current} settings={settings} />
    </div>
  );
});
