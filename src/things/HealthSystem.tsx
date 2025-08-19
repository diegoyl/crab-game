import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '../store/game';
import { useEffect, useRef } from 'react';

// Health system that detects when crab is in water and reduces health
export function HealthSystem() {
  const crabPos = useGame((s) => s.crabPos);
  const tideLevel = useGame((s) => s.tideLevel);
  const health = useGame((s) => s.health);
  const setHealth = useGame((s) => s.setHealth);
  const isFlipped = useGame((s) => s.isFlipped);
  const setFlipped = useGame((s) => s.setFlipped);
  const resetRun = useGame((s) => s.resetRun);
  const gamePhase = useGame((s) => s.gamePhase);
  const gameStartTime = useGame((s) => s.gameStartTime);
  const isPaused = useGame((s) => s.isPaused);

  // Ocean box parameters (matching Tide.tsx)
  const TOTAL_BOXES = 52;
  const IN_BOUNDS_BOXES = 50;
  const BOX_WIDTH = 100 / IN_BOUNDS_BOXES + 0.15;
  const BOX_HEIGHT = 1.2;
  const BOX_DEPTH = 200;
  const BOX_Y_OFFSET = -0.25;
  
  // Wave parameters (matching Tide.tsx)
  const WAVE_AMPLITUDE = 5;
  const WAVE_FREQUENCY = 0.02;
  const WAVE_SPEED = 1;

  // Handle flip/unflip logic - only during gameplay
  useEffect(() => {
    // Only run flip/unflip logic during 'playing' or 'rave' phase
    if (gamePhase !== 'playing' && gamePhase !== 'rave') {
      return;
    }
    
    console.log(`Health: ${health.toFixed(3)}, isFlipped: ${isFlipped}`); // Debug
    
    // Flip when health reaches 0 (or very close to 0)
    if (health <= 0.01 && !isFlipped) {
      console.log('\t\t2crotFLIPPING CRAB!'); // Debug
      setFlipped(true);
    }
    // Unflip when health reaches 10%
    else if (health >= 0.05 && isFlipped) {
      console.log('\t\t2crotUNFLIPPING CRAB!'); // Debug
      setFlipped(false);
    }
  }, [health, isFlipped, setFlipped, gamePhase]);

  // Function to check if crab is in water by testing collision with ocean boxes
  const checkWaterCollision = (crabX: number, crabZ: number, elapsedTime: number) => {
    // Calculate dynamic tide range based on game phase and time (same as Tide component)
    let tideRangeMin, tideRangeMax;
    
    if ((gamePhase === 'playing' || gamePhase === 'rave') && gameStartTime !== null) {
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
    
    // Check collision with each ocean box
    for (let i = 0; i < TOTAL_BOXES; i++) {
      let boxX, boxWidth;
      
      if (i === 0) {
        // Left out-of-bounds box
        boxX = -130;
        boxWidth = 160;
      } else if (i === TOTAL_BOXES - 1) {
        // Right out-of-bounds box
        boxX = 130;
        boxWidth = 160;
      } else {
        // In-bounds boxes
        const inBoundsIndex = i - 1;
        boxX = THREE.MathUtils.lerp(-50, 50, inBoundsIndex / (IN_BOUNDS_BOXES - 1));
        boxWidth = BOX_WIDTH;
      }
      
      // Calculate box Z position with wave animation
      const waveX = boxX * WAVE_FREQUENCY;
      const timePhase = elapsedTime * WAVE_SPEED;
      const waveOffset = Math.sin(waveX + tideLevel * Math.PI * 2 + (boxX / 50) * Math.PI * 2 * (0.95 + Math.random() * 0.1) + timePhase) * WAVE_AMPLITUDE;
      
      // Use the same Z position calculation as Tide component: Z = -20 + (tideLevel × 58)
      const tideZ = -20 + (tideLevel * 58);
      const boxZ = tideZ + waveOffset - BOX_DEPTH / 2; // Box center Z
      
      // Check if crab is within this box's bounds
      const boxHalfWidth = boxWidth / 2;
      const boxHalfDepth = BOX_DEPTH / 2;
      
      if (crabX >= boxX - boxHalfWidth && 
          crabX <= boxX + boxHalfWidth && 
          crabZ >= boxZ - boxHalfDepth && 
          crabZ <= boxZ + boxHalfDepth) {
        return true; // Crab is in water
      }
    }
    
    return false; // Crab is not in water
  };

  useFrame((state, delta) => {
    // Only run health system during 'playing' or 'rave' phase and when not paused
    if ((gamePhase !== 'playing' && gamePhase !== 'rave') || isPaused) {
      return;
    }
    
    // Check if crab is in water using proper collision detection
    const isInWater = checkWaterCollision(crabPos.x, crabPos.z, state.clock.elapsedTime);

    // Reduce health when in water (but not when flipped)
    if (isInWater && health > 0 && !isFlipped) {
      // Health should last 4 seconds in water
      const healthLossPerSecond = 1 / 4; // Lose 1/4th of health per second
      const newHealth = health - (healthLossPerSecond * delta);
      setHealth(newHealth);
    } else if (!isInWater && health < 1) {
      // Regenerate health when not in water (twice as slow as loss)
      const healthGainPerSecond = 1 / 12; // Regain health over 8 seconds
      const newHealth = health + (healthGainPerSecond * delta);
      setHealth(newHealth);
    }
  });

  return null; // This component doesn't render anything
}
