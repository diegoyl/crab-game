import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGame } from '../store/game';
import { COLORS } from '../constants/colors'

// Ocean texture shader
const oceanVertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vNormal;
  
  void main() {
    vUv = uv;
    vPosition = position;
    vNormal = normal;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const oceanFragmentShader = `
  uniform float time;
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vNormal;
  
  // Simple noise function for wave variation
  float noise(float x) {
    return fract(sin(x * 12.9898) * 43758.5453);
  }
  
  float smoothNoise(float x) {
    float i = floor(x);
    float f = fract(x);
    return mix(noise(i), noise(i + 1.0), f * f * (3.0 - 2.0 * f));
  }
  
  // Shader-based random function
  float random(float seed) {
    return fract(sin(seed * 78.233) * 43758.5453);
  }
  
  void main() {
    // Use the Z coordinate from the position (normalized to 0-1)
    // Box depth is 200, so we need to map from -100 to +100 to 0 to 1
    // Flip the coordinate so front (shoreline) is 0 and back is 1
    float zCoord = 1.0 - (vPosition.z + 100.0) / 200.0;
    
    // Define the gradient colors
    vec3 deepColor = vec3(0.063, 0.565, 0.835); // Dark blue (16, 144, 213)
    vec3 oceanColor = vec3(0.365, 0.824, 0.902); // Bright ocean blue (93, 210, 230)
    vec3 foamColor = vec3(0.7, 0.930, 0.981); // Foam white mixed with ocean blue
    
    vec3 finalColor;
    
    // If we're in the back half (zCoord > 0.35), use solid deep blue
    if (zCoord > 0.35) {
      finalColor = deepColor;
    } else {
      // Front half: gradient from ocean blue (shoreline) to deep blue (middle)
      // Flip the gradient direction and scale to front half only
      float gradientCoord = zCoord / 0.35; // Scale 0-0.5 to 0-1
      
      // Create 20 banded steps for the gradient half
      int numBands = 5;
      float bandSize = 1.0 / float(numBands);
      int bandIndex = int(gradientCoord / bandSize);
      bandIndex = min(bandIndex, numBands - 1); // Clamp to prevent overflow
      
      // Interpolate from ocean blue (shoreline) to deep blue (middle)
      finalColor = mix(oceanColor, deepColor, float(bandIndex) / float(numBands - 1));
    }
    
    // Add wave foam bands
    // 2  waves that cycle continuously, each taking 8 seconds to complete
    float waveCycleTime = 11.0; // Complete cycle time
    float waveSpacing =  6.0; // Time between waves (2.67 seconds)
    
    // Check for 2 waves that cycle continuously
    for (int i = 0; i < 2; i++) {
      // Calculate wave time within its cycle (0 to waveCycleTime)
      float waveTime = mod(time - float(i) * waveSpacing, waveCycleTime);
      
      // Calculate wave position (starts at 0.5, moves toward 0)
      float waveSpeed = 0.5 / waveCycleTime; // Distance per second
      float wavePos = 0.5 - waveTime * waveSpeed;
      
             // Calculate base wave width (starts at 1, grows to 4, then shrinks)
       float baseWaveWidth;
       if (waveTime < 10.4) {
         // Growing phase (0-10 seconds): width 1 to 3
         baseWaveWidth = 0.5 + (waveTime / 10.4) * 1.5;
       } else {
         // Shrinking phase (10-11 seconds): width 3 to 1
         baseWaveWidth = 2.0 - ((waveTime - 10.4) / 1.0) * 1.5;
       }
       
               // Add noise variation to the wave width
        float noiseScale = 0.4; // How much noise affects the width
        
        // Add X-position phase offset (discretized to maintain consistency within boxes)
        float boxXCoord = (vPosition.x + 50.0) / 100.0; // Normalize X from -50 to +50 to 0 to 1
        int boxIndex = int(boxXCoord * 50.0);
        boxIndex = clamp(boxIndex, 0, 49); // Clamp to valid box range
        float discreteBoxCoord = float(boxIndex) / 50.0; // Convert back to 0-1 range
        
        float noiseValue = sin(wavePos * 50.0 + time * 0.5 + float(i) * 100.0 + discreteBoxCoord * 6.28);
        
        float waveWidth = baseWaveWidth + (noiseValue -0.2) * noiseScale;
      
             // Check if current pixel is within the wave band
       if (abs(zCoord - wavePos) < waveWidth * 0.01) { // Scale width to match coordinate space
         // Blend foam with underlying color based on distance from shore
         // Closer to shore (lower zCoord) = more white, further = more blue
         float foamBlend = 1.0 - (wavePos / 0.5); // 0 at start, 1 at shore
         foamBlend = clamp(foamBlend, 0.0, 1.0); // Clamp to 0-1 range
         finalColor = mix(finalColor, foamColor, foamBlend);
         break; // Use the first matching wave
       }
    }
    
    // Add static foam band at shoreline edge (zCoord = 0)
    if (abs(zCoord - 0.0) < 1.2 * 0.01) { // Static band with width = 2
      finalColor = foamColor;
    }
    
    // Add lighting to match scene lights
    // Directional light from position [10, 33, 5] - high up and to the right
    vec3 lightDir = normalize(vec3(10.0, 33.0, 5.0));
    float diffuse = max(dot(normalize(vNormal), lightDir), 0.0);
    
    // Match scene lighting intensities
    float ambient = 0.8; // Scene ambient light intensity
    float directional = 0.3; // Scene directional light intensity
    
    // Calculate lighting (ambient + diffuse)
    float lighting = ambient + diffuse * directional;
    
    // Apply lighting to the color
    finalColor *= lighting;
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

// Ocean with wavy shoreline using multiple boxes
export function Tide() {
  const tideLevel = useGame((s) => s.tideLevel);
  const gamePhase = useGame((s) => s.gamePhase);
  const gameStartTime = useGame((s) => s.gameStartTime);
  const isPaused = useGame((s) => s.isPaused);
  const boxesRef = useRef<THREE.Group>(null);

  // Configurable beach zones
  const DRY_BEACH_MIN = 38;
  const DRY_BEACH_MAX = 15;
  const DEEP_OCEAN_START = -10;

  // Ocean box parameters
  const TOTAL_BOXES = 52; // 50 for in-bounds + 1 each for left/right out-of-bounds
  const IN_BOUNDS_BOXES = 50;
  const BOX_WIDTH = 100 / IN_BOUNDS_BOXES + .15; // Width of each box
  const BOX_HEIGHT = 1.2; // Height of ocean boxes
  const BOX_DEPTH = 200; // Depth of ocean boxes
  const BOX_Y_OFFSET = -0.25; // Height above beach plane

  // Wave parameters
  const WAVE_AMPLITUDE = 5; // How far boxes move in Z direction
  const WAVE_FREQUENCY = 0.02; // Wave frequency (back to original for proper spacing)
  const RANDOMNESS = 0.3; // 10% randomness
  const WAVE_SPEED = 1; // How fast the wave pattern travels sideways

  // Create ocean shader material
  const oceanMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: oceanVertexShader,
      fragmentShader: oceanFragmentShader,
      transparent: false,
      side: THREE.DoubleSide,
      uniforms: {
        time: { value: 0 }
      }
    });
  }, []);

  // Create ocean boxes
  const oceanBoxes = useMemo(() => {
    const boxes = [];
    
    for (let i = 0; i < TOTAL_BOXES; i++) {
      // Use wider boxes for out-of-bounds areas
      let boxWidth;
      if (i === 0 || i === TOTAL_BOXES - 1) {
        // Out-of-bounds boxes: cover from ±50 to ±210 (160 units wide each)
        boxWidth = 160;
      } else {
        // In-bounds boxes: use calculated width
        boxWidth = BOX_WIDTH;
      }
      const geometry = new THREE.BoxGeometry(boxWidth, BOX_HEIGHT, BOX_DEPTH);
      
      const box = new THREE.Mesh(geometry, oceanMaterial);
      
      // Add some basic lighting properties to make it visible
      box.castShadow = false;
      box.receiveShadow = true;
      
      // Calculate X position
      let xPos;
      if (i === 0) {
        // Left out-of-bounds box (covers from -210 to -50)
        xPos = -130; // Center of left gap
      } else if (i === TOTAL_BOXES - 1) {
        // Right out-of-bounds box (covers from +50 to +210)
        xPos = 130; // Center of right gap
      } else {
        // In-bounds boxes (50 boxes covering -50 to +50)
        const inBoundsIndex = i - 1;
        xPos = THREE.MathUtils.lerp(-50, 50, inBoundsIndex / (IN_BOUNDS_BOXES - 1));
      }
      
      box.position.set(xPos, BOX_Y_OFFSET, 0);
      box.userData = {
        index: i,
        baseX: xPos,
        phaseOffset: (xPos / 50) * Math.PI * 2  * (0.95+Math.random()*0.1), // Phase based on X position: 3 cycles across -50 to +50
        amplitudeVariation: 1.0 // ±0.1% amplitude variation
        // amplitudeVariation: (1.0 - RANDOMNESS) + (Math.random() - 0.5) * RANDOMNESS * 2 // ±0.1% amplitude variation
      };
      
      boxes.push(box);
    }
    
    return boxes;
  }, []);

  useFrame((state, delta) => {
    // Skip tide updates if paused
    if (isPaused) return;
    
    if (!boxesRef.current) return;
    
    // Update shader time uniform
    oceanMaterial.uniforms.time.value = state.clock.elapsedTime;
    
    // Calculate dynamic tide range based on game phase and time
    let tideRangeMin, tideRangeMax;
    
         if (gamePhase === 'playing' && gameStartTime !== null) {
       const gameTime = (Date.now() - gameStartTime) / 1000;
       const cycle = 10;
       const currentCycleIndex = Math.floor(gameTime / cycle);
      
             if (currentCycleIndex < 6) {
                   const increment = 0.4 / 6;  // 0.067 per cycle (same for min and max)
         
         const currentMin = currentCycleIndex * increment;
         const currentMax = 0.6 + (currentCycleIndex * increment);
        
        // Convert to Z positions: Z = -20 + (tideLevel × 58)
        tideRangeMin = -20 + (currentMin * 58);
        tideRangeMax = -20 + (currentMax * 58);
             } else {
         // Final state
         tideRangeMin = -20 + (0.4 * 58);
         tideRangeMax = -20 + (1.0 * 58);
       }
         } else {
       // Pre-game: use simple tide cycle
       tideRangeMin = -20;
       tideRangeMax = 0;
     }
    
    // Update each box position based on tide level and wave pattern
    oceanBoxes.forEach((box, index) => {
      const { baseX, phaseOffset, amplitudeVariation } = box.userData;
      
      // Calculate wave offset based on X position, tide level, and time
      const waveX = baseX * WAVE_FREQUENCY;
      const timePhase = state.clock.elapsedTime * WAVE_SPEED; // Time-based phase shift
      const waveOffset = Math.sin(waveX + tideLevel * Math.PI * 2 + phaseOffset + timePhase) * WAVE_AMPLITUDE * amplitudeVariation;
      
      // Calculate Z position based on tide level
      // tideLevel is a normalized value (0-1) representing position within current cycle range
      // Convert it to actual Z position using the same formula as debug panel: Z = -20 + (tideLevel × 58)
      const tideZ = -20 + (tideLevel * 58);
      const zPos = tideZ + waveOffset;
      
      // Position box so its front edge aligns with the shoreline
      // Box depth is 200, so center should be 100 units behind the shoreline
      const boxCenterZ = zPos - BOX_DEPTH / 2;
      
      // Update box position
      box.position.z = boxCenterZ;
    });
  });

  return (
    <group ref={boxesRef}>
      {oceanBoxes.map((box, index) => (
        <primitive key={index} object={box} />
      ))}
    </group>
  );
}