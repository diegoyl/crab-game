import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGame, Shell } from '../store/game';
import seedrandom from 'seedrandom';

const FIXED_STEP = 1 / 60;
const TOTAL_SHELLS = 150;

function seededRng(seed: string) {
  const rng = seedrandom(seed);
  return () => rng.quick();
}

export function GameLoop() {
  const setShells = useGame((s) => s.setShells);
  const markCollected = useGame((s) => s.markCollected);
  const addScore = useGame((s) => s.addScore);
  const crabPos = useGame((s) => s.crabPos);
  const shells = useGame((s) => s.shells);
  const setTide = useGame((s) => s.setTide);
  const setTideLevel = useGame((s) => s.setTideLevel);
  const gamePhase = useGame((s) => s.gamePhase);
  const setGamePhase = useGame((s) => s.setGamePhase);
  const gameStartTime = useGame((s) => s.gameStartTime);
  const setGameStartTime = useGame((s) => s.setGameStartTime);
  const isPaused = useGame((s) => s.isPaused);
  const getEffectiveGameTime = useGame((s) => s.getEffectiveGameTime);

  const rng = useRef<() => number>();
  const accumulator = useRef(0);
  const timeSinceTide = useRef(0);
  const currentCycle = useRef(0);
  const tideMin = useRef(0.0);
  const tideMax = useRef(0.4);
  const showTimeUpPopup = useRef(false);

  useEffect(() => {
    rng.current = seededRng('crab');
    // Shells x range gets smaller clsoer to beach edge (due to camera constraints)
    const xHalfRangeMax = 50 
    const xHalfRangeMin = 10 
    // Shells only in tide zone (Z: +15 to -10)
    const zMin = -20; // tide zone end (deep ocean)
    const zMax = 30;  // tide zone start (dry beach)
    const initial: Shell[] = [];
    for (let i = 0; i < TOTAL_SHELLS; i++) {
      const r = rng.current!();
      const biased = r * r; // quadratic bias toward 0
      const z = zMin + biased * (zMax - zMin);

      const xHalfRange = (xHalfRangeMax - xHalfRangeMin) * (1 - biased) + xHalfRangeMin;
      const x = (rng.current!() * 2 - 1) * xHalfRange;

      initial.push({ id: i, x, z, collected: false });
    }
    setShells(initial);
  }, [setShells]);

     // Track when game starts and reset tide range
   useEffect(() => {
     if ((gamePhase === 'playing' || gamePhase === 'rave') && gameStartTime === null) {
       setGameStartTime(Date.now());
       currentCycle.current = 0;
       tideMin.current = 0.0;
       tideMax.current = 0.6;
     } else if (gamePhase !== 'playing' && gamePhase !== 'ending' && gamePhase !== 'rave') {
       setGameStartTime(null);
       showTimeUpPopup.current = false;
       currentCycle.current = 0;
       tideMin.current = 0.0;
       tideMax.current = 0.6;
     }
   }, [gamePhase, gameStartTime, setGameStartTime]);

  useFrame((_, delta) => {
    // Skip game loop if paused
    if (isPaused) return;
    
    const clamped = Math.min(delta, 0.1);
    accumulator.current += clamped;
    while (accumulator.current >= FIXED_STEP) {
      step(FIXED_STEP);
      accumulator.current -= FIXED_STEP;
    }
  });

  function step(dt: number) {
         // Simple tide cycle
     timeSinceTide.current += dt;
     const cycle = 10; // seconds per full tide cycle
     const t = (timeSinceTide.current % cycle) / cycle; // 0..1
    
                 // Check if game time is up - end at peak tide of last cycle
    if (gamePhase === 'playing' && gameStartTime !== null) {
      const gameTime = getEffectiveGameTime(); // Use effective game time (minus pause time)
      const cycle = 10;
      const currentCycleIndex = Math.floor(gameTime / cycle);
      const cycleProgress = (gameTime % cycle) / cycle; // 0 to 1 within current cycle
      
      // Safety check: ensure game ends if we somehow exceed the maximum cycles
      if (currentCycleIndex > 5 && !showTimeUpPopup.current) {
        console.log(`Safety check: Game exceeded max cycles (${currentCycleIndex} > 5), ending game`);
        showTimeUpPopup.current = true;
        setGamePhase('ending'); // Start ending animation
      }
      // End game when we're in the last cycle (cycle 5) and reach peak tide (0.5 progress)
      else if (currentCycleIndex === 5 && cycleProgress >= 0.5 && !showTimeUpPopup.current) {
        showTimeUpPopup.current = true;
        setGamePhase('ending'); // Start ending animation
      }
    }
    
    // Calculate asymmetric tide cycle
    // Instead of 0-1 cycle, we need min0 -> max0 -> min1 cycle
    let effectiveLevel = 0.5; // Default value
    
         if ((gamePhase === 'playing' || gamePhase === 'ending' || gamePhase === 'rave') && gameStartTime !== null) {
       const gameTime = getEffectiveGameTime(); // Use effective game time (minus pause time)
       const cycle = 10;
       const currentCycleIndex = Math.floor(gameTime / cycle);
       const cycleProgress = (gameTime % cycle) / cycle; // 0 to 1 within current cycle
      
                                    if (currentCycleIndex < 6 && (gamePhase === 'playing' || gamePhase === 'rave')) {
           // Calculate tide range for current cycle
           // Tide level 1.0 maps to Z=38
           // Safe zone: area above max tide but below Z=38
           // Range should decrease over time (min grows faster than max)
           
           // Cycle 0: min=0, max=0.6 (Z: -20 to 8.8)
           // Final: min=0.4, max=1.0 (Z: 9.2 to 38)
           const increment = 0.4 / 6;  // 0.067 per cycle (same for min and max)
           
           const currentMin = currentCycleIndex * increment;
           const currentMax = 0.6 + (currentCycleIndex * increment);
           const nextMin = (currentCycleIndex + 1) * increment;
           
           // For cycle 0, start at progress 0.5 (high tide) instead of 0.0
           let adjustedCycleProgress = cycleProgress;
           if (currentCycleIndex === 0) {
             adjustedCycleProgress = 0.5 + cycleProgress; // Start at 0.5, go to 1.5
             if (adjustedCycleProgress > 1.0) {
               adjustedCycleProgress = 1.0; // Clamp to 1.0
             }
           }
           
           // Asymmetric cycle: rise from currentMin to currentMax, then fall to nextMin
           if (adjustedCycleProgress < 0.5) {
             // Rising phase: currentMin to currentMax
             const riseProgress = adjustedCycleProgress * 2; // 0 to 1
             effectiveLevel = currentMin + (riseProgress * (currentMax - currentMin));
           } else {
             // Falling phase: currentMax to nextMin
             const fallProgress = (adjustedCycleProgress - 0.5) * 2; // 0 to 1
             effectiveLevel = currentMax - (fallProgress * (currentMax - nextMin));
           }
         
                    // Ensure smooth transition by clamping to exact values at boundaries
           if (adjustedCycleProgress < 0.001) {
             effectiveLevel = currentMin;
           } else if (adjustedCycleProgress > 0.999) {
             effectiveLevel = nextMin;
           }
             } else if (gamePhase === 'playing') {
         // Final state during playing
         effectiveLevel = 0.8 + (0.2 * (0.5 - 0.5 * Math.cos(2 * Math.PI * t)));
       } else if (gamePhase === 'ending') {
         // During ending phase: symmetric tide cycle with fixed min/max
         const finalMin = 0.4; // Final min from cycle 5
         const finalMax = 1.0; // Final max from cycle 5
         const level = 0.5 - 0.5 * Math.cos(2 * Math.PI * t);
         effectiveLevel = finalMin + (level * (finalMax - finalMin));
       }
    } else {
      // Pre-game: normal symmetric cycle
      const level = 0.5 - 0.5 * Math.cos(2 * Math.PI * t);
      effectiveLevel = tideMin.current + (level * (tideMax.current - tideMin.current));
    }
    
    setTideLevel(effectiveLevel);
    
         // Phase buckets for UI (using cycle progress within current cycle)
     if ((gamePhase === 'playing' || gamePhase === 'ending') && gameStartTime !== null) {
       const gameTime = (Date.now() - gameStartTime) / 1000;
       const cycleProgress = (gameTime % cycle) / cycle;
       
       // For cycle 0, adjust the progress for phase detection
       let adjustedCycleProgress = cycleProgress;
       if (Math.floor(gameTime / cycle) === 0) {
         adjustedCycleProgress = 0.5 + cycleProgress;
         if (adjustedCycleProgress > 1.0) {
           adjustedCycleProgress = 1.0;
         }
       }
       
       if (adjustedCycleProgress < 0.05) setTide('low');
       else if (adjustedCycleProgress < 0.5) setTide('rising');
       else if (adjustedCycleProgress > 0.95) setTide('high');
       else setTide('falling');
    } else {
      // Pre-game phase detection
      if (t < 0.05) setTide('low');
      else if (t < 0.5) setTide('rising');
      else if (t > 0.95) setTide('high');
      else setTide('falling');
    }

    // Cheap circle collision crab vs shells
    const radiusCrab = 0.8;
    const radiusShell = 0.4;
    const r2 = (radiusCrab + radiusShell) * (radiusCrab + radiusShell);
    for (let i = 0; i < shells.length; i++) {
      const sh = shells[i];
      if (sh.collected) continue;
      const dx = sh.x - crabPos.x;
      const dz = sh.z - crabPos.z;
      if (dx * dx + dz * dz <= r2) {
        markCollected(sh.id);
        addScore(1);
      }
    }
  }

  return null;
}


