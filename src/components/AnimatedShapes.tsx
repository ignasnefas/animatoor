import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AnimationSettings, GeometryType } from '../types';

function createGeometry(type: GeometryType): THREE.BufferGeometry {
  switch (type) {
    case 'torus':
      return new THREE.TorusGeometry(1, 0.4, 32, 64);
    case 'torusKnot':
      return new THREE.TorusKnotGeometry(0.8, 0.3, 128, 32);
    case 'icosahedron':
      return new THREE.IcosahedronGeometry(0.8, 0);
    case 'octahedron':
      return new THREE.OctahedronGeometry(0.8, 0);
    case 'dodecahedron':
      return new THREE.DodecahedronGeometry(0.8, 0);
    case 'cube':
      return new THREE.BoxGeometry(1, 1, 1);
    case 'sphere':
      return new THREE.SphereGeometry(0.8, 32, 32);
    case 'cylinder':
      return new THREE.CylinderGeometry(0.5, 0.5, 1.2, 32);
    case 'cone':
      return new THREE.ConeGeometry(0.7, 1.2, 32);
    case 'tetrahedron':
      return new THREE.TetrahedronGeometry(0.8, 0);
    case 'plane':
      return new THREE.PlaneGeometry(1.2, 1.2, 8, 8);
    case 'ring':
      return new THREE.RingGeometry(0.4, 0.8, 32);
    case 'pyramid':
      return new THREE.ConeGeometry(0.7, 1.2, 4);
    case 'prism':
      return new THREE.CylinderGeometry(0.8, 0.8, 1, 6);
    default:
      return new THREE.TorusKnotGeometry(0.8, 0.3, 128, 32);
  }
}

interface ShapeProps {
  settings: AnimationSettings;
  index: number;
  total: number;
}

function Shape({ settings, index, total }: ShapeProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => createGeometry(settings.geometryType), [settings.geometryType]);

  const material = useMemo(() => {
    const color1 = new THREE.Color(settings.shapeColor);
    const color2 = new THREE.Color(settings.shapeColor2);
    const mixedColor = color1.clone().lerp(color2, total > 1 ? index / (total - 1) : 0);

    if (settings.wireframe) {
      return new THREE.MeshStandardMaterial({
        color: mixedColor,
        wireframe: true,
        emissive: mixedColor,
        emissiveIntensity: 0.3,
        metalness: settings.metalness,
        roughness: settings.roughness,
      });
    }

    return new THREE.MeshStandardMaterial({
      color: mixedColor,
      metalness: settings.metalness,
      roughness: settings.roughness,
      emissive: mixedColor,
      emissiveIntensity: 0.15,
    });
  }, [settings.shapeColor, settings.shapeColor2, settings.wireframe, settings.metalness, settings.roughness, index, total]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;

    // Get raw elapsed time
    const t = clock.getElapsedTime();
    // Calculate loop position (0 to 1) based on loopDuration, independent of speed
    let loopT = (t % settings.loopDuration) / settings.loopDuration;
    
    // Ensure loopT stays in valid range [0, 1) to prevent floating point precision issues
    // that can cause jumps at loop boundaries, especially in exported videos
    if (loopT >= 0.9999999) {
      loopT = 0;
    } else if (loopT < 0) {
      loopT = 0;
    }
    
    // Base phase always goes from 0 to 2π for a complete cycle per loopDuration
    const basePhase = loopT * Math.PI * 2;
    // Speed affects how fast the animation moves within the cycle
    const phase = basePhase * settings.speed;
    const offset = total > 1 ? (index / total) * Math.PI * 2 : 0;
    const amp = settings.amplitude;
    const spread = settings.spread;

    switch (settings.animationType) {
      case 'orbit': {
        const angle = phase + offset;
        const radius = spread * 0.5;
        meshRef.current.position.x = Math.cos(angle) * radius;
        meshRef.current.position.y = Math.sin(angle * 2) * amp * 0.3;
        meshRef.current.position.z = Math.sin(angle) * radius;
        meshRef.current.rotation.x = phase * 2 + offset;
        meshRef.current.rotation.y = phase * 2 + offset;
        break;
      }
      case 'breathe': {
        const breathScale = 1 + Math.sin(phase + offset) * 0.3 * amp;
        const baseAngle = offset;
        const radius = spread * 0.4;
        meshRef.current.position.x = Math.cos(baseAngle) * radius;
        meshRef.current.position.y = Math.sin(baseAngle) * radius * 0.5;
        meshRef.current.position.z = Math.sin(baseAngle * 0.7) * radius * 0.5;
        meshRef.current.scale.setScalar(breathScale * settings.shapeScale);
        meshRef.current.rotation.x = phase * 0.5 + offset;
        meshRef.current.rotation.y = phase * 0.3 + offset;
        break;
      }
      case 'spiral': {
        const spiralAngle = phase + offset;
        const spiralRadius = (1 + Math.sin(phase + offset * 2)) * spread * 0.3;
        const height = Math.cos(phase + offset) * amp;
        meshRef.current.position.x = Math.cos(spiralAngle) * spiralRadius;
        meshRef.current.position.y = height;
        meshRef.current.position.z = Math.sin(spiralAngle) * spiralRadius;
        meshRef.current.rotation.x = phase * 2;
        meshRef.current.rotation.z = phase * 1.5;
        break;
      }
      case 'wave': {
        const waveX = (index - total / 2) * spread * 0.3;
        const waveY = Math.sin(phase + offset) * amp;
        const waveZ = Math.cos(phase + offset * 0.5) * amp * 0.5;
        meshRef.current.position.x = waveX;
        meshRef.current.position.y = waveY;
        meshRef.current.position.z = waveZ;
        meshRef.current.rotation.x = phase + offset;
        meshRef.current.rotation.y = phase * 0.5;
        break;
      }
      case 'explode': {
        const explodePhase = Math.sin(phase) * 0.5 + 0.5;
        const explodeRadius = explodePhase * spread;
        const theta = offset;
        const phi = (index / total) * Math.PI;
        meshRef.current.position.x = Math.sin(phi) * Math.cos(theta) * explodeRadius;
        meshRef.current.position.y = Math.sin(phi) * Math.sin(theta) * explodeRadius;
        meshRef.current.position.z = Math.cos(phi) * explodeRadius;
        meshRef.current.rotation.x = phase * 2 + offset;
        meshRef.current.rotation.y = phase * 3 + offset;
        const explodeScale = 0.5 + (1 - explodePhase) * 0.5;
        meshRef.current.scale.setScalar(explodeScale * settings.shapeScale);
        break;
      }
      case 'morph': {
        const morphAngle = phase + offset;
        const morphR = spread * 0.4 * (1 + 0.3 * Math.sin(phase * 3 + offset));
        meshRef.current.position.x = Math.cos(morphAngle) * morphR;
        meshRef.current.position.y = Math.sin(morphAngle * 2) * amp * 0.5;
        meshRef.current.position.z = Math.sin(morphAngle) * morphR * 0.5;
        const morphScale = 1 + Math.sin(phase * 2 + offset) * 0.4;
        meshRef.current.scale.setScalar(morphScale * settings.shapeScale);
        meshRef.current.rotation.x = phase + offset;
        meshRef.current.rotation.y = phase * 2;
        meshRef.current.rotation.z = phase * 0.5 + offset;
        break;
      }
      case 'cascade': {
        const cascadeY = ((phase / (Math.PI * 2) + index / total) % 1) * spread * 2 - spread;
        const cascadeX = Math.sin(offset * 3) * spread * 0.3;
        const cascadeZ = Math.cos(offset * 5) * spread * 0.3;
        meshRef.current.position.x = cascadeX;
        meshRef.current.position.y = cascadeY;
        meshRef.current.position.z = cascadeZ;
        meshRef.current.rotation.x = phase * 2 + offset;
        meshRef.current.rotation.z = phase + offset;
        const cascadeAlpha = 1 - Math.abs(cascadeY) / spread;
        meshRef.current.scale.setScalar(cascadeAlpha * settings.shapeScale);
        break;
      }
      case 'vortex': {
        const vortexAngle = phase * 2 + offset;
        const vortexR = spread * 0.3 * (1 + 0.5 * Math.sin(phase + offset));
        const vortexY = Math.sin(phase * 2 + offset) * amp * 0.5;
        meshRef.current.position.x = Math.cos(vortexAngle) * vortexR;
        meshRef.current.position.y = vortexY;
        meshRef.current.position.z = Math.sin(vortexAngle) * vortexR;
        meshRef.current.rotation.x = phase * 3;
        meshRef.current.rotation.y = phase * 2 + offset;
        meshRef.current.rotation.z = phase;
        break;
      }
      case 'pendulum': {
        const pendulumAngle = Math.sin(phase + offset) * amp * 0.8;
        const pendulumX = (index - total / 2) * spread * 0.25;
        meshRef.current.position.x = pendulumX;
        meshRef.current.position.y = Math.cos(pendulumAngle) * 2 - 1;
        meshRef.current.position.z = Math.sin(pendulumAngle) * 1;
        meshRef.current.rotation.z = pendulumAngle;
        meshRef.current.rotation.x = phase * 0.3;
        break;
      }
      case 'kaleidoscope': {
        const kAngle = offset + phase;
        const kR = spread * 0.4;
        const kMirror = index % 2 === 0 ? 1 : -1;
        meshRef.current.position.x = Math.cos(kAngle) * kR * kMirror;
        meshRef.current.position.y = Math.sin(kAngle) * kR;
        meshRef.current.position.z = Math.sin(phase + offset * 2) * amp * 0.5;
        meshRef.current.rotation.x = phase * kMirror;
        meshRef.current.rotation.y = phase * 2;
        meshRef.current.rotation.z = kAngle;
        const kScale = 0.8 + Math.sin(phase * 2 + offset) * 0.3;
        meshRef.current.scale.setScalar(kScale * settings.shapeScale);
        break;
      }
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} scale={settings.shapeScale} />
  );
}

interface AnimatedShapesProps {
  settings: AnimationSettings;
}

export function AnimatedShapes({ settings }: AnimatedShapesProps) {
  const shapes = useMemo(() => {
    return Array.from({ length: settings.shapeCount }, (_, i) => (
      <Shape key={`${i}-${settings.geometryType}-${settings.shapeCount}`} settings={settings} index={i} total={settings.shapeCount} />
    ));
  }, [settings]);

  return <>{shapes}</>;
}
