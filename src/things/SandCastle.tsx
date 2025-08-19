import { useMemo } from 'react';
import * as THREE from 'three';
import { COLORS } from '../constants/colors'

export function SandCastle() {
  const sandMaterial = useMemo(() => new THREE.MeshStandardMaterial({ 
    color: COLORS.SAND.CASTLE, 
    roughness: 0.9,
    metalness: 0.0 
  }), []);

  return (
    <group position={[20, 0, 10]}>
      {/* Base platform */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[8, 1, 8]} />
        <primitive object={sandMaterial} attach="material" />
      </mesh>

      {/* Main tower */}
      <mesh position={[0, 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.5, 1.5, 3, 8]} />
        <primitive object={sandMaterial} attach="material" />
      </mesh>

      {/* Top cone */}
      <mesh position={[0, 4.5, 0]} castShadow receiveShadow>
        <coneGeometry args={[1, 1.5, 8]} />
        <primitive object={sandMaterial} attach="material" />
      </mesh>

      {/* Left tower */}
      <mesh position={[-2.5, 1.5, -2.5]} castShadow receiveShadow>
        <cylinderGeometry args={[0.8, 0.8, 2, 6]} />
        <primitive object={sandMaterial} attach="material" />
      </mesh>

      {/* Right tower */}
      <mesh position={[2.5, 1.5, -2.5]} castShadow receiveShadow>
        <cylinderGeometry args={[0.8, 0.8, 2, 6]} />
        <primitive object={sandMaterial} attach="material" />
      </mesh>

      {/* Back tower */}
      <mesh position={[0, 1.5, -2.5]} castShadow receiveShadow>
        <cylinderGeometry args={[0.8, 0.8, 2, 6]} />
        <primitive object={sandMaterial} attach="material" />
      </mesh>

      {/* Small decorative towers */}
      <mesh position={[-1.5, 0.8, 1.5]} castShadow receiveShadow>
        <cylinderGeometry args={[0.4, 0.4, 1.5, 6]} />
        <primitive object={sandMaterial} attach="material" />
      </mesh>

      <mesh position={[1.5, 0.8, 1.5]} castShadow receiveShadow>
        <cylinderGeometry args={[0.4, 0.4, 1.5, 6]} />
        <primitive object={sandMaterial} attach="material" />
      </mesh>

      {/* Flag */}
      <mesh position={[0, 5.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.05, 0.05, 1, 6]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>

      <mesh position={[0.5, 5.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 0.4, 0.05]} />
        <meshStandardMaterial color="#FF0000" />
      </mesh>
    </group>
  );
}
