import { useSound } from './index';
import { useClickSound } from '../hooks/useClickSound';

export function SoundSettings() {
  const { 
    musicVolume, 
    soundEffectsVolume, 
    musicEnabled, 
    soundEffectsEnabled, 
    setMusicVolume, 
    setSoundEffectsVolume, 
    setMusicEnabled, 
    setSoundEffectsEnabled 
  } = useSound();
  const { withClickSound } = useClickSound();

  const handleMusicToggle = withClickSound(() => {
    setMusicEnabled(!musicEnabled);
  });

  const handleSoundEffectsToggle = withClickSound(() => {
    setSoundEffectsEnabled(!soundEffectsEnabled);
  });

  return (
    <div className="sound-settings">
      
      {/* Music Controls */}
      <div className={`sound-control ${!musicEnabled ? 'disabled' : ''}`}>
        <label>
          <input
            type="checkbox"
            checked={musicEnabled}
            onChange={handleMusicToggle}
          />
          Music
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.02"
          value={musicVolume}
          onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
        />
      </div>
      
      {/* Sound Effects Controls */}
      <div className={`sound-control ${!soundEffectsEnabled ? 'disabled' : ''}`}>
        <label>
          <input
            type="checkbox"
            checked={soundEffectsEnabled}
            onChange={handleSoundEffectsToggle}
          />
          Sound FX
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.02"
          value={soundEffectsVolume}
          onChange={(e) => setSoundEffectsVolume(parseFloat(e.target.value))}
        />
      </div>

    </div>
  );
}
