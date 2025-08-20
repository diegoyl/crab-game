import { useGame } from '../store/game';
import { COLORS } from '../constants/colors';
import './GameOverMenu.css';
import { useEffect, useState } from 'react';
import { ShellsPopup } from './ShellsPopup';
import { useClickSound } from '../hooks/useClickSound';

export function GameOverMenu() {
  const score = useGame((s) => s.score);
  const highScore = useGame((s) => s.highScore);
  const totalShells = useGame((s) => s.totalShells);
  const resetRun = useGame((s) => s.resetRun);
  const setGamePhase = useGame((s) => s.setGamePhase);
  const addShellsToTotal = useGame((s) => s.addShellsToTotal);
  const subtractShellsForRave = useGame((s) => s.subtractShellsForRave);
  const useShellsForRave = useGame((s) => s.useShellsForRave);

  // Animation state for total shells counter
  const [animatedTotalShells, setAnimatedTotalShells] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Transition state
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isSlidingDown, setIsSlidingDown] = useState(false);
  
  // Shells popup state
  const [showShellsPopup, setShowShellsPopup] = useState(false);
  
  // Click sound hook
  const { withClickSound } = useClickSound();

  // Start animation when component mounts
  useEffect(() => {
    // Don't trigger add animation during rave transition
    if (isTransitioning) {
      return;
    }
    
    const oldTotal = totalShells - score; // Calculate old total before adding current score
    const newTotal = totalShells;
    
    if (oldTotal !== newTotal) {
      setAnimatedTotalShells(oldTotal);
      
      // Add delay before starting animation
      const delay = setTimeout(() => {
        setIsAnimating(true);
        
        // Animate the counter
        const animationDuration = 1000; // 1 second
        const steps = 30; // Number of steps in animation
        const stepDuration = animationDuration / steps;
        const increment = Math.ceil((newTotal - oldTotal) / steps);
        
        let currentValue = oldTotal;
        const interval = setInterval(() => {
          currentValue = Math.min(currentValue + increment, newTotal);
          setAnimatedTotalShells(currentValue);
          
          if (currentValue >= newTotal) {
            setIsAnimating(false);
            clearInterval(interval);
          }
        }, stepDuration);
        
        return () => clearInterval(interval);
      }, 500); // 0.5 second delay
      
      return () => clearTimeout(delay);
    } else {
      setAnimatedTotalShells(totalShells);
    }
  }, [totalShells, score, isTransitioning]);

  const handlePlayAgain = withClickSound(() => {
    // Reset score and go through loading phase for a fresh start
    const restartGame = useGame.getState().restartGame;
    restartGame();
  });

  const handleMainMenu = withClickSound(() => {
    resetRun();
    setGamePhase('enter');
  });

  const handleRave = withClickSound(async () => {
    if (totalShells < 100) {
      setShowShellsPopup(true);
      return;
    }

    // Start transition sequence
    setIsTransitioning(true);
    
    try {
      // Step 1: Animate shell subtraction locally
      const oldTotal = totalShells;
      const newTotal = totalShells - 100;
      
      // Start the subtract animation
      setAnimatedTotalShells(oldTotal);
      setIsAnimating(true);
      
      const animationDuration = 1000; // 1 second
      const steps = 30;
      const stepDuration = animationDuration / steps;
      
      let stepCount = 0;
      const interval = setInterval(() => {
        stepCount++;
        const progress = stepCount / steps;
        const currentValue = Math.round(oldTotal - (100 * progress));
        setAnimatedTotalShells(currentValue);
        
        if (stepCount >= steps) {
          clearInterval(interval);
          setIsAnimating(false);
        }
      }, stepDuration);
      
      // Actually subtract the shells immediately
      useShellsForRave();
      
      // Wait for animation to complete
      await subtractShellsForRave();
      
      // Step 2: Wait 0.5 seconds after subtraction animation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Step 3: Start menu slide down animation
      setIsSlidingDown(true);
      
      // Step 4: Wait for slide animation to complete (0.6s)
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Step 5: Transition to rave phase
      setGamePhase('rave');
      
    } catch (error) {
      setIsTransitioning(false);
      setIsSlidingDown(false);
    }
  });

  const isNewHighScore = score >= highScore && score > 0;

  return (
    <div className="game-over-overlay">
      <div className={`game-over-modal ${isSlidingDown ? 'sliding-down' : ''}`}>
        <h1 className="game-over-title">
          GAME OVER!
        </h1>

        <div className="score-section">
          
          <div className="score-line">
            <div className="score-label">
              Shells Collected
            </div>
            <div className="score-value">
              +  {score}
            </div>
          </div>
          
          
          {isNewHighScore ? (
            <div className="best-score">
              <p className="new-high-score">
                NEW HIGH SCORE!!!
              </p>
            </div>
          ) : (
            <div className="best-score">
              Best: {highScore}
            </div>
          )}


          <div className="score-line">
            <div className="score-label">
              Total Shells
            </div>
            <div className={`score-value ${isAnimating ? 'animating' : ''}`}>
              {animatedTotalShells}
            </div>
          </div>
        </div>

        <div className="button-container">
          <button
            onClick={handlePlayAgain}
            className="big-button"
            disabled={isTransitioning}
          >
            Play Again
          </button>
          
          <button
            onClick={handleRave}
            className="big-button"
            disabled={totalShells < 100 || isTransitioning}
          >
            <span className="rave-text">Rave</span>
            <div className="shell-icon-container">
              <img src="/shell-icon.png" alt="Shell" className="shell-icon" />
              <span className="shell-text">100</span>
            </div>
          </button>
        </div>

        <div className="main-menu-button-container">
          <button
            onClick={handleMainMenu}
            className="main-menu-button"
            disabled={isTransitioning}
          >
            ← Main Menu
          </button>
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
