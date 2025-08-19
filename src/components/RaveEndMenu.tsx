import { useGame } from '../store/game';
import './GameOverMenu.css'; // Reuse the same styles

export function RaveEndMenu() {
  const resetRun = useGame((s) => s.resetRun);
  const setGamePhase = useGame((s) => s.setGamePhase);
  const useShellsForRave = useGame((s) => s.useShellsForRave);
  const totalShells = useGame((s) => s.totalShells);

  const handleKeepRaving = () => {
    const success = useShellsForRave();
    if (success) {
      console.log('Keep raving! 50 shells spent.');
      setGamePhase('rave');
    } else {
      console.log('Not enough shells to keep raving!');
    }
  };

  const handlePlayAgain = () => {
    // Use restartGame to skip loading phase and go directly to ready
    const restartGame = useGame.getState().restartGame;
    restartGame();
  };

  const handleMainMenu = () => {
    resetRun();
    setGamePhase('enter');
  };

  return (
    <div className="game-over-overlay">
      <div className="game-over-modal">
        <h1 className="game-over-title" style={{fontSize: '5.8em'}}>
          NICE MOVES!
        </h1>

        <div className="button-container" style={{ flexDirection: 'column', gap: '20px' }}>
          <button
            onClick={handleKeepRaving}
            className="big-button"
            disabled={totalShells < 50}
          >
            <span className="rave-text">Keep Raving</span>
            <div className="shell-icon-container">
              <img src="/shell-icon.png" alt="Shell" className="shell-icon" />
              <span className="shell-text">50</span>
            </div>
          </button>
          
          <button
            onClick={handlePlayAgain}
            className="big-button"
          >
            Play Again
          </button>
          
          <div className="main-menu-button-container">
            <button
              onClick={handleMainMenu}
              className="main-menu-button"
            >
              ← Main Menu
            </button>
          </div>

          <div style={{height: '20px'}}></div>
          
        </div>
      </div>
    </div>
  );
}
