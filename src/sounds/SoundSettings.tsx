import { useSound } from './index';

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

  return (
    <div className="sound-settings">
      
      {/* Music Controls */}
      <div className={`sound-control ${!musicEnabled ? 'disabled' : ''}`}>
        <label>
          <input
            type="checkbox"
            checked={musicEnabled}
            onChange={(e) => setMusicEnabled(e.target.checked)}
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
            onChange={(e) => setSoundEffectsEnabled(e.target.checked)}
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
