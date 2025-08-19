import { useGame } from '../store/game';
import { COLORS } from '../constants/colors';
import './GameOverMenu.css';
import { useEffect, useState } from 'react';

export function GameOverMenu() {
  const score = useGame((s) => s.score);
  const highScore = useGame((s) => s.highScore);
  const totalShells = useGame((s) => s.totalShells);
  const resetRun = useGame((s) => s.resetRun);
  const setGamePhase = useGame((s) => s.setGamePhase);
  const addShellsToTotal = useGame((s) => s.addShellsToTotal);
  const useShellsForRave = useGame((s) => s.useShellsForRave);

  // Animation state for total shells counter
  const [animatedTotalShells, setAnimatedTotalShells] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Start animation when component mounts
  useEffect(() => {
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
  }, [totalShells, score]);

  const handlePlayAgain = () => {
    // Use restartGame to skip loading phase and go directly to ready
    const restartGame = useGame.getState().restartGame;
    restartGame();
  };

  const handleMainMenu = () => {
    resetRun();
    setGamePhase('enter');
  };

  const handleRave = () => {
    const success = useShellsForRave();
    if (success) {
      console.log('Rave mode activated! 50 shells spent.');
      console.log('Setting game phase to rave...');
      // Transition to rave phase
      setGamePhase('rave');
      console.log('Game phase set to rave!');
    } else {
      console.log('Not enough shells for rave mode!');
    }
  };

  const isNewHighScore = score >= highScore && score > 0;

  return (
    <div className="game-over-overlay">
      <div className="game-over-modal">
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
          >
            Play Again
          </button>
          
          <button
            onClick={handleRave}
            className="big-button"
            disabled={totalShells < 50}
          >
            <span className="rave-text">Rave</span>
            <div className="shell-icon-container">
              <img src="/shell-icon.png" alt="Shell" className="shell-icon" />
              <span className="shell-text">50</span>
            </div>
          </button>
        </div>

        <div className="main-menu-button-container">
          <button
            onClick={handleMainMenu}
            className="main-menu-button"
          >
            ← Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}
