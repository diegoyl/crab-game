import { useGame } from '../store/game';
import './GameOverMenu.css'; // Reuse the same styles
import { ShellsPopup } from './ShellsPopup';
import { useState } from 'react';
import { useClickSound } from '../hooks/useClickSound';
import { useSoundEvents } from '../sounds';

export function RaveEndMenu() {
  const resetRun = useGame((s) => s.resetRun);
  const setGamePhase = useGame((s) => s.setGamePhase);
  const endRaveMode = useGame((s) => s.endRaveMode);
  const useShellsForRave = useGame((s) => s.useShellsForRave);
  const totalShells = useGame((s) => s.totalShells);
  const { stopSound } = useSoundEvents();
  
  // Transition state
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isSlidingDown, setIsSlidingDown] = useState(false);
  
  // Shells popup state
  const [showShellsPopup, setShowShellsPopup] = useState(false);
  
  // Click sound hook
  const { withClickSound } = useClickSound();

  const handleKeepRaving = withClickSound(async () => {

    if (totalShells < 100) {
      setShowShellsPopup(true);
      return;
    }

    // Start transition sequence
    setIsTransitioning(true);
    
         try {
       // Step 1: Use shells for rave (immediate, no animation needed)
       const success = useShellsForRave();
       if (!success) {
         throw new Error('Failed to use shells for rave');
       }
       
       // Step 2: Start menu slide down animation
       setIsSlidingDown(true);
       
       // Step 3: Wait for slide animation to complete (0.6s)
       await new Promise(resolve => setTimeout(resolve, 600));
       
       // Step 4: Transition to rave phase
       setGamePhase('rave');
      
    } catch (error) {
      setIsTransitioning(false);
      setIsSlidingDown(false);
    }
  });

  const handlePlayAgain = withClickSound(() => {
    // Use restartGame to skip loading phase and go directly to ready
    const restartGame = useGame.getState().restartGame;
    restartGame();
  });

  const handleMainMenu = withClickSound(() => {
    // Stop rave music first
    stopSound('raveMusic');
    
    // Properly end rave mode and reset the game
    endRaveMode();
    resetRun();
  });

  return (
    <div className="game-over-overlay">
      <div className={`game-over-modal ${isSlidingDown ? 'sliding-down' : ''}`}>
        <h1 className="game-over-title" style={{fontSize: '5.8em'}}>
          NICE MOVES!
        </h1>

        <div className="button-container" style={{ flexDirection: 'column', gap: '20px' }}>
          <button
            onClick={handleKeepRaving}
            className="big-button"
            disabled={totalShells < 100 || isTransitioning}
          >
            <span className="rave-text">Keep Raving</span>
            <div className="shell-icon-container">
              <img src="/shell-icon.png" alt="Shell" className="shell-icon" />
              <span className="shell-text">100</span>
            </div>
          </button>
          
          <button
            onClick={handlePlayAgain}
            className="big-button"
            disabled={isTransitioning}
          >
            Play Again
          </button>
          
          <div className="main-menu-button-container">
            <button
              onClick={handleMainMenu}
              className="main-menu-button"
              disabled={isTransitioning}
            >
              ← Main Menu
            </button>
          </div>

          <div style={{height: '20px'}}></div>
          
        </div>
      </div>
      
      <ShellsPopup 
        totalShells={totalShells}
        isVisible={showShellsPopup}
        onHide={() => setShowShellsPopup(false)}
      />
    </div>
  );
}
