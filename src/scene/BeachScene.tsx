import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGame } from '../store/game';
import { Crab } from '../things/Crab';
import { ShellField } from '../things/ShellField';
import { Tide } from '../things/Tide';
import { HealthSystem } from '../things/HealthSystem';
import { GameLoop } from '../systems/GameLoop';
import { OrbitControls, GizmoHelper, GizmoViewport } from '@react-three/drei';
import * as THREE from 'three';

// Cloud background component
function CloudBackground() {
  const cloudTexture = useMemo(() => {
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load('/cloud-background.png');
    texture.wrapS = THREE.RepeatWrapping;
    texture.repeat.set(3, 1); // Repeat 3 times horizontally, 1 time vertically
    return texture;
  }, []);

  return (
    <mesh position={[0, 39.8, -150]} rotation-y={Math.PI}>
      <planeGeometry args={[1200, 80]} />
      <meshBasicMaterial 
        map={cloudTexture} 
        transparent={true}
        alphaTest={0.1}
        side={THREE.BackSide}
        toneMapped={false}
        color={new THREE.Color(0xffffff)}
      />
    </mesh>
  );
}

export function BeachScene() {
  // Create beach material with speckles using canvas
  const beachMaterial = useMemo(() => {
    // Create canvas for texture
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    // Set canvas size (power of 2 for better performance)
    canvas.width = 2048;
    canvas.height = 2048;
    
    // Fill with base sand color
    ctx.fillStyle = '#ffc45c'; // Light sand color
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Create wet layer (only in tide range Z: 20 to -15) - DRAW FIRST
    const wetSize = canvas.width / 512; // Larger squares
    const wetColor = '#eb9a38'; // Darker orange sand
    
    ctx.fillStyle = wetColor;
    
    // Calculate tide range in texture coordinates
    // Beach plane: Z = -20 to +140 (340 units total)
    // Tide range: Z = 20 to -15 (35 units)
    // Since texture is inverted, map to bottom portion of texture
    const beachStartZ = -190;
    const beachEndZ = 150;
    const boundStartZ = 38;
    const tideStartZ = -30;
    const tideEndZ = 24;
    
    // Convert Z coordinates to texture Y coordinates (0 to 1)
    const tideStartY = (tideStartZ - beachStartZ) / (beachEndZ - beachStartZ);
    const tideEndY = (tideEndZ - beachStartZ) / (beachEndZ - beachStartZ);
    const boundStartY = (boundStartZ - beachStartZ)   / (beachEndZ - beachStartZ);
    
    // Convert to canvas coordinates (inverted for correct mapping)
    const canvasTideStartY = tideStartY * canvas.height; // Don't invert Y coordinate
    const canvasTideEndY = tideEndY * canvas.height;
    const canvasBoundStartY = boundStartY * canvas.height;
    
    // Generate wet layer speckles only in tide range
    for (let i = 0; i < 105000; i++) { // Generate wet speckles
      const x = Math.random() * canvas.width;
      const y = canvasTideStartY + Math.random() * (canvasTideEndY - canvasTideStartY);
      
      // 50% chance to place a wet speckle
      const speckleRamp = (y - canvasTideStartY) / (canvasTideEndY - canvasTideStartY) * 0.98;
      if (Math.random() < (1.0 - speckleRamp)) {
        ctx.fillRect(x, y, wetSize, wetSize);
      }
    }
    
    
    // Create grass - DRAW 2nd LAST (on top of wet speckle, below grass)
    const grassSize = canvas.width / 512; // 1/4000 of plane size
    const grassColorBase = '#964618'; // Medium-dark brown
    
    const grassStart = canvasBoundStartY +5;
    const grassMid = canvasBoundStartY + 150;
    const grassEnd = canvasBoundStartY + 300;
    // Generate random grasss with 30% density
    for (let i = 0; i < 500000; i++) { // Generate many grasss
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      
      // 10% chance to place a grass
      let grassProb = 0.0;
      let grassScale = 1.0;

      // threshold for high density in out of bounds area
      if (y > grassMid) {
        grassProb = 1.0;
        grassScale = 2.0;
      } else if (y > grassStart) {
        grassProb = (y - (grassStart))/50.0;
        grassScale = 1.0 + grassProb * 0.15;
      }

      if (Math.random() < grassProb) {
          // Mix grass color with black based on y position (higher y = darker)
          const yNormalized = (y- grassStart) / (grassEnd - grassStart); // 0 to 1
          const yNoise = yNormalized + Math.random() * 0.3 - 0.15; // 0 to 1
          const clampedY = Math.max(0, Math.min(1, yNoise)); // Clamp to 0-1
          const discreteLevel = Math.floor(clampedY * 10) / 10; // 10 discrete levels (0.0, 0.1, 0.2, ..., 0.9)
          const darkenFactor = discreteLevel * 0.7; // Max 70% darker
          
          // Convert hex to RGB
          const baseColor = parseInt(grassColorBase.slice(1), 16);
          const r = (baseColor >> 16) & 255;
          const g = (baseColor >> 8) & 255;
          const b = baseColor & 255;
          
          // Mix with black
          const newR = Math.floor(r * (1 - darkenFactor));
          const newG = Math.floor(g * (1 - darkenFactor));
          const newB = Math.floor(b * (1 - darkenFactor));
          
          ctx.fillStyle = `rgb(${newR}, ${newG}, ${newB})`;
          ctx.fillRect(x, y, grassSize * grassScale, grassSize * grassScale);
        }
    }

    // FILL IN THE LOWER 20% OF CANVAS WITH OCEAN
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, canvas.width, canvas.height * 0.2);  

    
    // Create speckles - DRAW LAST
    const speckleSize = canvas.width / 2048; // 1/4000 of plane size
    const speckleColor = '#6e2a16'; // Medium-dark brown
    
    ctx.fillStyle = speckleColor;
    
    // Generate random speckles with 30% density
    for (let i = 0; i < 1050000; i++) { // Generate many speckles
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      
      // 10% chance to place a speckle
      let speckleProb = 0.06;

      // threshold for high density in out of bounds area
      if (y > canvasBoundStartY + 10) {
        speckleProb = 1.0;
      } 
      if (Math.random() < speckleProb) {
        ctx.fillRect(x, y, speckleSize, speckleSize);
      }
    }
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.5,
      metalness: 0.0
    });
    
    return material;
  }, []);

  return (
    <>
      <ambientLight intensity={1.0} />
      <directionalLight
        position={[10, 33, 5]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-80}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
      />
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, -20]} receiveShadow>
        <planeGeometry args={[340, 340, 1, 1]} />
        <primitive object={beachMaterial} attach="material" />
      </mesh>

      <Crab />
      <CameraFollowZ />
      <ShellField />
      <Tide />
      <HealthSystem />
      <CloudBackground />
      <StrobeLights />
      <OrbitControls makeDefault enablePan={false} enableZoom={false} enableRotate={false} minPolarAngle={-1.0} maxPolarAngle={1.5} />
      {/* <GizmoHelper alignment="bottom-left" margin={[56, 56]}>
        <GizmoViewport axisColors={["#ff3653", "#8adb00", "#2c8fff"]} labelColor="white" />
      </GizmoHelper> */}
      <GameLoop />
      <CloudBackground />
    </>
  );
}

function CameraFollowZ() {
  const crabPos = useGame((s) => s.crabPos);
  const gamePhase = useGame((s) => s.gamePhase);
  const gameStartTime = useGame((s) => s.gameStartTime);
  const { camera, controls } = useThree() as any;
  
  // Track zoom animation state
  const zoomStartTimeRef = useRef<number | null>(null);
  const zoomDuration = 2.0; // Duration of zoom animation in seconds

  // Camera ending animation state
  const endingAnimationRef = useRef<{
    isActive: boolean;
    startPos: THREE.Vector3;
    startTarget: THREE.Vector3;
    endPos: THREE.Vector3;
    endTarget: THREE.Vector3;
    startTime: number;
    duration: number;
  }>({
    isActive: false,
    startPos: new THREE.Vector3(),
    startTarget: new THREE.Vector3(),
    endPos: new THREE.Vector3(0, 2, 45), // Target position: x=0, y=2, z=45
    endTarget: new THREE.Vector3(0, 0, 0), // Look at horizon (0, 0, 0)
    startTime: 0,
    duration: 600, // 0.8 seconds transition
  });

  useFrame((state, delta) => {
    // Handle ending camera animation
    if (gamePhase === 'ending') {
      const animation = endingAnimationRef.current;
      
      // Start camera animation if not already active
      if (!animation.isActive) {
        animation.isActive = true;
        animation.startPos = camera.position.clone();
        animation.startTarget = new THREE.Vector3(0, 0, 0); // Current target (assuming it looks at origin)
        animation.startTime = Date.now();
        
        console.log('Starting camera transition to ending position');
      }
      
      // Update camera animation
      const elapsed = Date.now() - animation.startTime;
      const progress = Math.min(elapsed / animation.duration, 1.0);
      
      // Smooth easing function
      const easedProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
      
      // Interpolate camera position
      camera.position.lerpVectors(animation.startPos, animation.endPos, easedProgress);
      
      // Interpolate camera target (look at point)
      const currentTarget = new THREE.Vector3();
      currentTarget.lerpVectors(animation.startTarget, animation.endTarget, easedProgress);
      
      // Make camera look at the target
      camera.lookAt(currentTarget);
      
      // Update camera matrix
      camera.updateMatrixWorld();
      
      // Skip normal camera logic during ending
      return;
    }

    // Keep camera fixed during game over phase
    if (gamePhase === 'gameOver') {
      // Ensure camera stays at the ending position
      camera.position.set(0, 2, 45);
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();
      
      // Skip normal camera logic during game over
      return;
    }

    // Handle rave phase camera - fixed position with conditional rave pulsing
    if (gamePhase === 'rave' || gamePhase === 'raveEnd') {
      // Base camera position
      const baseY = 2.7;
      const baseZ = 44;
      
      // Check if we're in an active rave section (only during rave phase, not raveEnd)
      const raveMusicStartTime = useGame.getState().raveMusicStartTime;
      const isInActiveSection = (() => {
        if (!raveMusicStartTime || gamePhase === 'raveEnd') return false;
        
        const currentTime = (Date.now() - raveMusicStartTime) / 1000; // Current time in seconds
        
        // Active sections: [19.2 to 50.0], [82.6 to 111.0]
        const section1 = currentTime >= 19.2 && currentTime <= 50.0;
        const section2 = currentTime >= 82.6 && currentTime <= 111.0;
        
        return section1 || section2;
      })();
      
      if (isInActiveSection) {
        // Rave pulsing effect - mimics nightclub bass vibrations
        const time = Date.now() * 0.001;
        const pulseIntensity = 0.1; // How strong the effect is
        
        // Vertical bounce (Y position changes) - complete cycle every 0.48 seconds
        const bounceFrequency = (2 * Math.PI) / 0.48; // radians per second for 0.48s cycle
        const bouncePulse = Math.sin(time * bounceFrequency) * pulseIntensity * 0.15;
        
        // Zoom pulse (Z position changes) - bell curve with left-shifted peak and quadratic fade
        const cycleTime = (time * bounceFrequency) % (2 * Math.PI); // Get position in current cycle
        const normalizedTime = cycleTime / (2 * Math.PI); // 0 to 1
        
        // Create bell curve with left-shifted peak and quadratic fade
        let zapEffect = 0;
        if (normalizedTime < 0.3) {
          // Left side: quick rise to peak (shifted left)
          zapEffect = Math.pow(normalizedTime / 0.3, 2);
        } else {
          // Right side: quadratic fade
          const fadeTime = (normalizedTime - 0.3) / 0.7; // 0 to 1 for fade portion
          zapEffect = Math.pow(1 - fadeTime, 2);
        }
        
        const zoomPulse = zapEffect * pulseIntensity * 5;

        // Apply pulsing to camera position
        camera.position.set(0, baseY + bouncePulse, baseZ + zoomPulse);
        camera.lookAt(0, 1 + bouncePulse * 2, 32); // Look at the rave area (Z=32)
      } else {
        // Fixed camera position during non-active sections
        camera.position.set(0, baseY, baseZ);
        camera.lookAt(0, 1, 32); // Look at the rave area (Z=32)
      }
      
      camera.updateMatrixWorld();
      
      // Skip normal camera logic during rave
      return;
    }

    // Handle main menu camera position
    if (gamePhase === 'enter') {
      // Position camera behind crab, looking toward beach at 30-degree angle
      camera.position.set(0, 8, 20); // Behind crab (z=34), elevated, looking toward beach
      camera.lookAt(0, 0, 34); // Look at crab position
      camera.updateMatrixWorld();
      
      // Skip normal camera logic during main menu
      return;
    }

    const lerpAlpha = 1 - Math.exp(-delta * 4);
    
    // Handle zoom animation - zoomed in during loading and ready, normal during playing
    let zoomFactor = 1.0; // Normal zoom level
    
    if (gamePhase === 'loading' || gamePhase === 'ready') {
      // Start zoomed in (close-up of crab) but farther back for parallel view
      zoomFactor = 0.83; // Moderate zoom, farther back
    } else if (gamePhase === 'playing') {
      // Normal zoom for gameplay
      zoomFactor = 1.0;
    }
    
    // Z following with reduced sensitivity (1/8 of crab movement)
    const baseZOffset = 18; // Keep the same initial distance
    const followSensitivity = 0.75; // Camera moves 1/8 as much as the crab
    const crabZOffset = (crabPos.z - 20) * followSensitivity; // 20 is the new starting Z position
    
    const targetZ = THREE.MathUtils.clamp(20 + baseZOffset + crabZOffset, -70, 46);
    
    // Apply zoom factor to the distance
    const zoomedTargetZ = targetZ * zoomFactor;
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, zoomedTargetZ, lerpAlpha);
    
    // Keep X position centered
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, 0, lerpAlpha);
    
    // Adjust Y position based on game phase and crab Z position
    let targetY = 1; // Normal gameplay height
    
    if (gamePhase === 'loading' || gamePhase === 'ready') {
      targetY = 1.6; // Very low position for horizon-level view
    } else if (gamePhase === 'playing') {
      // Calculate dynamic minimum Z bound based on current tide range
      const getMinZBound = () => {
        if (gamePhase === 'playing' && gameStartTime !== null) {
          const gameTime = (Date.now() - gameStartTime) / 1000;
          const cycle = 10;
          const currentCycleIndex = Math.floor(gameTime / cycle);
          
          if (currentCycleIndex < 6) {
            const increment = 0.4 / 6;  // 0.067 per cycle (same for min and max)
            const currentMin = currentCycleIndex * increment;
            // Convert to Z position: Z = -20 + (currentMin × 58)
            return -20 + (currentMin * 58);
          } else {
            // Final state
            return -20 + (0.4 * 58);
          }
        } else {
          // Pre-game: use -20 as minimum
          return -20;
        }
      };
      
      // Raise Y position as crab moves into ocean (Z decreases)
      const minZ = -20; // Dynamic ocean edge based on tide range
      const maxZ = 38;  // Beach edge (from new crab bounds)
      const crabZNormalized = THREE.MathUtils.clamp((crabPos.z - minZ) / (maxZ - minZ), 0, 1);
      
      // Y varies from 15 (beach) to 25 (ocean)
      targetY = 2 + (15) * (1 - crabZNormalized);
    }
    
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, lerpAlpha);
    
    // Y-axis rotation to follow crab side-to-side
    const maxRotationAngle = Math.PI / 6; // 30 degrees max rotation
    const rotationSensitivity = 0.3; // How much the crab's X position affects rotation
    const targetRotationY = THREE.MathUtils.clamp(
      crabPos.x * rotationSensitivity * (Math.PI / 180), // Convert to radians
      -maxRotationAngle,
      maxRotationAngle
    );
    
    // Apply rotation to camera
    camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, targetRotationY, lerpAlpha);
    
    if (controls && controls.target) {
      // Keep target at crab level for consistent framing
      const targetY = 0.4; // Crab level
      
      controls.target.z = THREE.MathUtils.lerp(controls.target.z, crabPos.z, lerpAlpha);
      controls.target.x = THREE.MathUtils.lerp(controls.target.x, crabPos.x * 0.1, lerpAlpha); // Slight X following for target
      controls.target.y = THREE.MathUtils.lerp(controls.target.y, targetY, lerpAlpha);
      controls.update?.();
    }
  });

  return null;
}

// Strobe lights component for rave phase
function StrobeLights() {
  const { gamePhase } = useGame();
  const lightsRef = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if ((gamePhase !== 'rave' && gamePhase !== 'raveEnd') || !lightsRef.current) return;
    
    // Check if we're in an active rave section (only during rave phase, not raveEnd)
    const raveMusicStartTime = useGame.getState().raveMusicStartTime;
    const isInActiveSection = (() => {
      if (!raveMusicStartTime || gamePhase === 'raveEnd') return false;
      
      const currentTime = (Date.now() - raveMusicStartTime) / 1000; // Current time in seconds
      
      // Active sections: [19.2 to 50.0], [82.6 to 111.0]
      const section1 = currentTime >= 19.2 && currentTime <= 50.0;
      const section2 = currentTime >= 82.6 && currentTime <= 111.0;
      
      return section1 || section2;
    })();
    
    // Turn off all lights if not in active section
    if (!isInActiveSection) {
      lightsRef.current.children.forEach((light) => {
        if (light instanceof THREE.DirectionalLight) {
          light.intensity = 0;
        }
      });
      return;
    }
    
    const time = Date.now() * 0.001;
    const bounceFrequency = (2 * Math.PI) / 0.48; // Same frequency as camera pulse
    
    // Color cycling for each light
    const colors = [
      new THREE.Color(0xff0000), // Red
      new THREE.Color(0x00ff00), // Green
      new THREE.Color(0x0000ff), // Blue
    ];
    
    // Update each light
    lightsRef.current.children.forEach((light, index) => {
      if (light instanceof THREE.DirectionalLight) {
        // Cycle colors at different speeds for each light
        const colorIndex = Math.floor((time * (1 + index * 0.3)) * 2) % colors.length;
        light.color.copy(colors[colorIndex]);
        
        // Flash intensity based on the same rhythm as camera
        const cycleTime = (time * bounceFrequency) % (2 * Math.PI);
        const normalizedTime = cycleTime / (2 * Math.PI);
        
        // Create flash effect
        let flashIntensity = 0;
        if (normalizedTime < 0.3) {
          flashIntensity = Math.pow(normalizedTime / 0.3, 2);
        } else {
          const fadeTime = (normalizedTime - 0.3) / 0.7;
          flashIntensity = Math.pow(1 - fadeTime, 2);
        }
        
        // Add some randomness to each light
        const randomOffset = Math.sin(time * (2 + index * 0.5)) * 0.3;
        light.intensity = (flashIntensity + randomOffset) * 3;
      }
    });
  });
  
  if (gamePhase !== 'rave' && gamePhase !== 'raveEnd') return null;
  
  return (
    <group ref={lightsRef}>
      {/* Front left light */}
      <directionalLight 
        position={[-15, 10, 25]} 
        intensity={0} 
        castShadow={false}
        target-position={[0, 0, 32]}
      />
      
      {/* Front right light */}
      <directionalLight 
        position={[15, 10, 25]} 
        intensity={0} 
        castShadow={false}
        target-position={[0, 0, 32]}
      />
      
      {/* Back left light */}
      <directionalLight 
        position={[-15, 8, 40]} 
        intensity={0} 
        castShadow={false}
        target-position={[0, 0, 32]}
      />
      
      {/* Back right light */}
      <directionalLight 
        position={[15, 8, 40]} 
        intensity={0} 
        castShadow={false}
        target-position={[0, 0, 32]}
      />
    </group>
  );
}




