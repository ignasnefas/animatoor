export interface AnimationSettings {
  // Scene
  backgroundColor: string;
  backgroundGradient: boolean;
  backgroundGradientColor: string;

  // Geometry
  geometryType: GeometryType;
  shapeCount: number;
  shapeScale: number;
  shapeColor: string;
  shapeColor2: string;
  useGradientMaterial: boolean;
  wireframe: boolean;
  metalness: number;
  roughness: number;

  // Animation
  animationType: AnimationType;
  loopDuration: number; // seconds for one complete loop
  speed: number;
  amplitude: number;
  spread: number;

  // Camera
  cameraDistance: number;
  cameraAutoRotate: boolean;
  cameraAutoRotateSpeed: number;

  // Effects
  bloomEnabled: boolean;
  bloomIntensity: number;
  motionBlurEnabled: boolean;
  motionBlurAmount: number;

  // Render modes - ASCII
  asciiEnabled: boolean;
  asciiCharset: 'standard' | 'dense' | 'minimal' | 'blocks' | 'braille';
  asciiResolution: number;
  asciiOpacity: number; // 0-1, opacity of ASCII text
  asciiBackgroundOpacity: number; // 0-1, opacity of background
  asciiTextColor: string; // hex color for monochrome mode
  asciiFontSize: number; // pixels (unused now — auto-sized)
  asciiInvert: boolean; // invert brightness
  asciiContrast: number; // 0-3, adjust contrast
  asciiColorMode: boolean; // true = colored ASCII from scene, false = monochrome

  // Export
  exportWidth: number;
  exportHeight: number;
  exportFps: number;
  exportFormat: 'webm' | 'gif';
  exportLoopCount: number;
  seamlessLoopVerification: boolean;
}

export type GeometryType =
  | 'torus'
  | 'torusKnot'
  | 'icosahedron'
  | 'octahedron'
  | 'dodecahedron'
  | 'cube'
  | 'sphere'
  | 'cylinder'
  | 'cone'
  | 'tetrahedron'
  | 'plane'
  | 'ring'
  | 'pyramid'
  | 'prism';

export type AnimationType =
  | 'orbit'
  | 'breathe'
  | 'spiral'
  | 'wave'
  | 'explode'
  | 'morph'
  | 'cascade'
  | 'vortex'
  | 'pendulum'
  | 'kaleidoscope';

export interface Preset {
  id: string;
  name: string;
  description: string;
  thumbnail: string; // emoji
  settings: Partial<AnimationSettings>;
}
