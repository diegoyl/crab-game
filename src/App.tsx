import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr, PerformanceMonitor } from '@react-three/drei';
import { BeachScene } from './scene/BeachScene';
import { useGame } from './store/game';
import { SoundLoader } from './sounds/SoundLoader';
import { SoundController } from './sounds/SoundController';
import { AudioInitializer } from './sounds/AudioInitializer';
import { useSoundEvents } from './sounds';
import { LoadingOverlay } from './components/LoadingOverlay';
import { GameOverMenu } from './components/GameOverMenu';
import { RaveEndMenu } from './components/RaveEndMenu';
import { CursorManager } from './components/CursorManager';
import { PauseButton } from './components/PauseButton';
import { PausePopup } from './components/PausePopup';
import { useEffect, useRef } from 'react';

export function App() {
  const score = useGame((s) => s.score);
  const highScore = useGame((s) => s.highScore);
  const health = useGame((s) => s.health);
  const crabPos = useGame((s) => s.crabPos);
  const gamePhase = useGame((s) => s.gamePhase);
  const gameStartTime = useGame((s) => s.gameStartTime);
  const tideLevel = useGame((s) => s.tideLevel);
  const isPaused = useGame((s) => s.isPaused);
  const setPaused = useGame((s) => s.setPaused);
  const resetRun = useGame((s) => s.resetRun);
  const setGamePhase = useGame((s) => s.setGamePhase);
  const getEffectiveGameTime = useGame((s) => s.getEffectiveGameTime);
  const { stopSound } = useSoundEvents();
  
  // Debug log for game phase changes
  // const tidePhase = useGame((s) => s.tidePhase);
  
  // Calculate current tide Z positions and cycle progress for debug panel
  const getTideInfo = () => {
    if (gamePhase !== 'playing' || gameStartTime === null) {
      // Pre-game: use simple tide cycle
      const currentTideZ = -20 + (tideLevel * 20); // Simple conversion for pre-game
      return { minZ: -20, maxZ: 0, cycleProgress: 0, currentCycle: -1, currentTideZ };
    }
    
    // Calculate current cycle and tide range
    const gameTime = getEffectiveGameTime(); // Use effective game time (minus pause time)
    const cycle = 10;
    const currentCycleIndex = Math.floor(gameTime / cycle);
    let cycleProgress = (gameTime % cycle) / cycle; // 0 to 1 within current cycle
    
    // For cycle 0, adjust the progress to start at 0.5 (high tide)
    if (currentCycleIndex === 0) {
      cycleProgress = 0.5 + cycleProgress;
      if (cycleProgress > 1.0) {
        cycleProgress = 1.0;
      }
    }
    
            if (currentCycleIndex < 6) {
              const increment = 0.4 / 6;  // 0.067 per cycle (same for min and max)
      
      const currentMin = currentCycleIndex * increment;
      const currentMax = 0.6 + (currentCycleIndex * increment);
      
      // Convert to Z positions: Z = -20 + (tideLevel × 58)
      const minZ = -20 + (currentMin * 58);
      const maxZ = -20 + (currentMax * 58);
      
      // Calculate current tide Z position using the normalized tideLevel
      const currentTideZ = -20 + (tideLevel * 58);
      
      return { minZ, maxZ, cycleProgress, currentCycle: currentCycleIndex, currentTideZ };
    } else {
      // Final state
      const currentTideZ = -20 + (tideLevel * 58);
      return { 
        minZ: -20 + (0.4 * 58), 
        maxZ: -20 + (1.0 * 58), 
        cycleProgress, 
        currentCycle: currentCycleIndex,
        currentTideZ
      };
    }
  };
  
  const tideInfo = getTideInfo();

  return (
    <div className="app-root">
      {gamePhase === 'playing' && (
        <div className="hud">
          <div className="shell-icon-container shell-icon-hud">
            <img src="/shell-icon.png" alt="Shell" className="shell-icon score-shell" />
            <span className="shell-text">{score}</span>
          </div>
          <div className="health-container">
            <div className="health-bar">
              <div 
                className={`health-fill ${health <= 0 ? 'health-empty' : ''}`}
                style={{ width: `${health * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}
      <AudioInitializer />
      <CursorManager />
      <LoadingOverlay />
      {gamePhase === 'gameOver' && <GameOverMenu />}
      {gamePhase === 'raveEnd' && <RaveEndMenu />}
      
      {/* Pause System - only show during playing phase */}
      {gamePhase === 'playing' && (
        <>
          <PauseButton onPause={() => setPaused(true)} />
          <PausePopup 
            isOpen={isPaused} 
            onClose={() => setPaused(false)} 
          />
        </>
      )}

      {/* Main Menu Button for Rave Phase */}
      {gamePhase === 'rave' && (
        <div className="main-menu-button-container rave-main-menu">
          <button
            onClick={() => {
              // Stop rave music first
              stopSound('raveMusic');
              
              // Reset game and go to main menu
              resetRun();
              setGamePhase('enter');
            }}
            className="main-menu-button"
          >
            ← Main Menu
          </button>
        </div>
      )}

      {/* Strobe Overlay for Rave Phase */}
      {gamePhase === 'rave' && <StrobeOverlay />}

      {/* CRAB POS DEBUG */}
      {/* <div style={{
        position: 'absolute',
        bottom: '70px',
        left: '70px',
        background: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '4px',
        fontFamily: "'Darumadrop One', cursive",
        fontSize: '12px',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        whiteSpace: 'nowrap',
        zIndex: 1000
      }}>
        <div style={{ marginBottom: '4px', fontWeight: 'bold'}}>CRAB POSITION</div>
        <div style={{fontSize: '20px'}}>x {crabPos.x.toFixed(0)}</div>
        <div style={{fontSize: '20px'}}>z {crabPos.z.toFixed(0)}</div>
      </div> */}
      
      {/* TIDE POSITION DEBUG */}
      {/* <div style={{
        position: 'absolute',
        bottom: '70px',
        left: '250px',
        background: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '4px',
        fontFamily: "'Darumadrop One', cursive",
        fontSize: '12px',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        whiteSpace: 'nowrap',
        zIndex: 1000
      }}>
        <div style={{ marginBottom: '4px', fontWeight: 'bold'}}>TIDE Z POSITIONS</div>
        <div style={{fontSize: '16px'}}>min: {tideInfo.minZ.toFixed(1)}</div>
        <div style={{fontSize: '16px'}}>max: {tideInfo.maxZ.toFixed(1)}</div>
        <div style={{fontSize: '16px'}}>current: {tideInfo.currentTideZ.toFixed(1)}</div>
        <div style={{fontSize: '14px', marginTop: '4px'}}>cycle: {tideInfo.currentCycle}</div>
        <div style={{fontSize: '14px'}}>progress: {tideInfo.cycleProgress.toFixed(2)}</div>
      </div> */}
      
      <Canvas camera={{ position: [-20, 40, 50], fov: 45 }} shadows>
        <PerformanceMonitor>
          <AdaptiveDpr pixelated />
          <Suspense fallback={null}>
            <BeachScene />
            <SoundLoader />
            <SoundController />
          </Suspense>
        </PerformanceMonitor>
      </Canvas>
    </div>
  );
}

// Strobe overlay component for rave phase
function StrobeOverlay() {
  const overlayRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const updateOverlay = () => {
      if (!overlayRef.current) return;
      
      // Check if we're in an active rave section (only during rave phase, not raveEnd)
      const gamePhase = useGame.getState().gamePhase;
      const raveMusicStartTime = useGame.getState().raveMusicStartTime;
      const isInActiveSection = (() => {
        if (!raveMusicStartTime || gamePhase === 'raveEnd') return false;
        
        const currentTime = (Date.now() - raveMusicStartTime) / 1000; // Current time in seconds
        
        // Active sections: [19.2 to 50.0], [82.6 to 111.0]
        const section1 = currentTime >= 19.2 && currentTime <= 50.0;
        const section2 = currentTime >= 82.6 && currentTime <= 111.0;
        
        return section1 || section2;
      })();
      
      // Clear overlay if not in active section
      if (!isInActiveSection) {
        overlayRef.current.style.backgroundColor = 'transparent';
        return;
      }
      
      const time = Date.now() * 0.001;
      const bounceFrequency = (2 * Math.PI) / 0.48 /2; // Same frequency as camera pulse
      
      // Color cycling
      const colors = [
        'rgba(255, 0, 0, 0.1)',   // Red
        'rgba(0, 255, 0, 0.1)',   // Green
        'rgba(0, 0, 255, 0.1)',   // Blue
      ];
      
      const colorIndex = Math.floor(time * 2) % colors.length;
      
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
      
      // Apply color and intensity
      const alpha = flashIntensity * 0.3; // Max 30% opacity
      const color = colors[colorIndex].replace('0.1', alpha.toString());
      
      overlayRef.current.style.backgroundColor = color;
    };
    
    const interval = setInterval(updateOverlay, 16); // ~60fps
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div
      ref={overlayRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none', // Don't block clicks
        zIndex: 999, // High z-index but below UI elements
        transition: 'background-color 0.016s ease-out', // Smooth color transitions
      }}
    />
  );
}


