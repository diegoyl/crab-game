import { useGame } from '../store/game';
import { SoundSettings } from '../sounds/SoundSettings';
import './PausePopup.css';
import { useClickSound } from '../hooks/useClickSound';

interface PausePopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PausePopup({ isOpen, onClose }: PausePopupProps) {
  const resetRun = useGame((s) => s.resetRun);
  const setGamePhase = useGame((s) => s.setGamePhase);
  const { withClickSound } = useClickSound();

  if (!isOpen) return null;

  const handleMainMenu = withClickSound(() => {
    resetRun();
    setGamePhase('enter');
    onClose();
  });

  const handleResume = withClickSound(() => {
    onClose();
  });

  return (
    <div className="popup-overlay" onClick={withClickSound(onClose)}>
      <div className="popup-modal pause-modal" onClick={(e) => e.stopPropagation()}>
        
        <div className="popup-content">
          <h2 className="popup-title">Paused</h2>
          
          <div className="pause-content">
            <SoundSettings />
            
            <div className="pause-buttons">
              <button className="pause-resume-button" onClick={handleResume}>
                Resume
              </button>
              
              <button className="pause-main-menu-button" onClick={handleMainMenu}>
                ← Main Menu
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
