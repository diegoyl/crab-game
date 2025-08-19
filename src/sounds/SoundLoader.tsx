import { useEffect, useRef } from 'react';
import { useSound } from './index';
import { useGame } from '../store/game';

// Sound file paths - you can add your actual sound files here
const SOUND_FILES = {
  // Event sounds
  shellCollection: '/sounds/shell-collection.mp3',
  crabFlip: '/sounds/crab-flip.mp3',
  crabRevival: '/sounds/crab-revival.mp3',
  yelling: '/sounds/yelling.mp3',
  
  // Looping sounds
  backgroundAmbient: '/sounds/background-ambient.mp3',
  drowning: '/sounds/drowning.mp3',
  backgroundMusic: '/sounds/music.mp3',
  raveMusic: '/sounds/rave_music1.mp3',
  
  // Footstep sounds (8 individual files)
  footstep_1: '/sounds/footsteps/footstep-1.mp3',
  footstep_2: '/sounds/footsteps/footstep-2.mp3',
  footstep_3: '/sounds/footsteps/footstep-3.mp3',
  footstep_4: '/sounds/footsteps/footstep-4.mp3',
  footstep_5: '/sounds/footsteps/footstep-5.mp3',
  footstep_6: '/sounds/footsteps/footstep-6.mp3',
  footstep_7: '/sounds/footsteps/footstep-7.mp3',
  footstep_8: '/sounds/footsteps/footstep-8.mp3',
  
  // Wet footstep sounds (8 individual files)
  wet_1: '/sounds/footsteps/wet-1.mp3',
  wet_2: '/sounds/footsteps/wet-2.mp3',
  wet_3: '/sounds/footsteps/wet-3.mp3',
  wet_4: '/sounds/footsteps/wet-4.mp3',
  wet_5: '/sounds/footsteps/wet-5.mp3',
  wet_6: '/sounds/footsteps/wet-6.mp3',
  wet_7: '/sounds/footsteps/wet-7.mp3',
  wet_8: '/sounds/footsteps/wet-8.mp3',
};

export function SoundLoader() {
  const { loadSound, initializeOnUserInteraction, playSound } = useSound();
  const { gamePhase, finishLoading } = useGame();
  const preloadStartedRef = useRef(false);
  const preloadPromiseRef = useRef<Promise<void> | null>(null);
  const ambientStartedRef = useRef(false);

  // Preload sounds when user clicks enter overlay (stays in enter phase)
  useEffect(() => {
    const startPreloading = async () => {
      if (gamePhase === 'enter' && !preloadStartedRef.current) {
        preloadStartedRef.current = true;
        console.log('Starting background sound preloading...');
        
        // Initialize audio context first
        await initializeOnUserInteraction();
        
        // Start preloading all sound files
        preloadPromiseRef.current = loadAllSounds();
      }
    };

    startPreloading();
  }, [gamePhase, initializeOnUserInteraction]);

  // Handle loading phase - wait for preload to complete
  useEffect(() => {
    const handleLoadingPhase = async () => {
      if (gamePhase !== 'loading') return;

      console.log('Loading phase - waiting for sounds to complete...');
      
      // Wait for preload to complete (or start loading if not started)
      if (preloadPromiseRef.current) {
        try {
          await preloadPromiseRef.current;
          console.log('Sounds already preloaded, finishing immediately');
        } catch (error) {
          console.error('Preload failed, retrying...', error);
          // Retry loading
          preloadPromiseRef.current = loadAllSounds();
          await preloadPromiseRef.current;
        }
      } else {
        // Preload wasn't started, load now
        console.log('No preload found, loading sounds now...');
        preloadPromiseRef.current = loadAllSounds();
        await preloadPromiseRef.current;
      }
      
      finishLoading(); // Move to ready phase
    };

    handleLoadingPhase();
  }, [gamePhase, finishLoading]);

  const loadAllSounds = async () => {
    // Load all sound files
    const loadPromises = Object.entries(SOUND_FILES).map(([name, url]) =>
      loadSound(name, url).catch(error => {
        console.warn(`Failed to load sound ${name}:`, error);
      })
    );
    
    try {
      await Promise.all(loadPromises);
      console.log('All sounds loaded successfully');
      
      // Start playing ambient noise as soon as it's loaded
      if (!ambientStartedRef.current) {
        ambientStartedRef.current = true;
        console.log('Starting ambient noise...');
        await playSound('backgroundAmbient');
      }
    } catch (error) {
      console.error('Some sounds failed to load:', error);
      throw error; // Re-throw so we can retry
    }
  };

  return null; // This component doesn't render anything
}
