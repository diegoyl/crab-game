import { SoundSettings } from '../sounds/SoundSettings';
import './SettingsPopup.css';

interface SettingsPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPopup({ isOpen, onClose }: SettingsPopupProps) {
  if (!isOpen) return null;

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-modal" onClick={(e) => e.stopPropagation()}>
        <button className="popup-close-button" onClick={onClose}>
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
