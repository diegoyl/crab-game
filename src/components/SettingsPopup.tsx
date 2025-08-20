import { SoundSettings } from '../sounds/SoundSettings';
import './SettingsPopup.css';
import { useClickSound } from '../hooks/useClickSound';

interface SettingsPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPopup({ isOpen, onClose }: SettingsPopupProps) {
  const { withClickSound } = useClickSound();
  if (!isOpen) return null;

  return (
    <div className="popup-overlay" onClick={withClickSound(onClose)}>
      <div className="popup-modal" onClick={(e) => e.stopPropagation()}>
        <button className="popup-close-button" onClick={withClickSound(onClose)}>
          X
        </button>
        
        <div className="popup-content">
          <h2 className="popup-title">Settings</h2>
          <SoundSettings />
        </div>
      </div>
    </div>
  );
}
