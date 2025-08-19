import { useGame } from '../store/game';
import { useState } from 'react';
import { SettingsPopup } from './SettingsPopup';
import { AboutPopup } from './AboutPopup';

export function LoadingOverlay() {
  const { gamePhase, startLoading, startGame } = useGame();
  const [enterMode, setEnterMode] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [hasShownEnterOverlay, setHasShownEnterOverlay] = useState(false);

  // Don't show overlay if game is playing, game over, or rave
  if (gamePhase === 'playing' || gamePhase === 'gameOver' || gamePhase === 'rave') return null;

  const handleEnterClick = () => {
    setIsLoading(true);
    setHasShownEnterOverlay(true);
    
    // Wait 2 seconds for scene to load, then slide out
    // Sound preloading happens automatically in background
    setTimeout(() => {
      setEnterMode(false);
    }, 4000);
  };

  const handlePlayClick = () => {
    // Transition to loading phase (sounds may already be preloaded)
    startLoading();
  };

  const handleStartClick = () => {
    startGame();
  };

  const handleSettingsClick = () => {
    setIsSettingsOpen(true);
  };

  const handleAboutClick = () => {
    setIsAboutOpen(true);
  };

  return (
    <div className="loading-overlay">
      {gamePhase === 'enter' && (
        <>
          <div className="enter-background"></div>
          
          {/* Title - positioned outside content div for proper layering */}
          <div className="main-title">REJI'S RAVE</div>
          
          <div className="enter-content">
            <div className="enter-content-inner">
              <div className="main-menu-buttons">
                <button className="menu-button" onClick={handleSettingsClick}>
                  Settings
                </button>
                <button className="menu-button play-button" onClick={handlePlayClick}>
                  Play
                </button>
                <button className="menu-button" onClick={handleAboutClick}>
                  About
                </button>
              </div>
            </div>
          </div>
          
          {/* Enter overlay - only show if we haven't shown it before */}
          {!hasShownEnterOverlay && (
            <div className={`enter-overlay ${!enterMode ? 'slide-out' : ''}`} onClick={handleEnterClick}>
              <div className={`enter-text ${isLoading ? 'loading-text' : ''}`}>
                {isLoading ? 'Loading...' : 'Click anywhere to start'}
              </div>
            </div>
          )}
        </>
      )}
      
      {gamePhase === 'loading' && (
        <>
          <div className="overlay-background"></div>
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <div className="loading-text">Loading...</div>
          </div>
        </>
      )}
      
      {gamePhase === 'ready' && (
        <>
          <div className="overlay-background" onClick={handleStartClick}></div>
          <div className="start-content" onClick={handleStartClick}>
            <div className="start-text">Click to unflip Reji</div>
            <div className="start-subtitle">Collect shells before the tide gets too high!</div>
          </div>
        </>
      )}
      
      {/* Popup Components */}
      <SettingsPopup 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
      <AboutPopup 
        isOpen={isAboutOpen} 
        onClose={() => setIsAboutOpen(false)} 
      />
    </div>
  );
}
