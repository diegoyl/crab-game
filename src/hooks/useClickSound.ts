import { useCallback } from 'react';
import { useSoundEvents } from '../sounds';

export function useClickSound() {
  const { playSound } = useSoundEvents();
  
  const playClickSound = useCallback(async () => {
    try {
      // Use the dedicated UI click sound
      await playSound('uiClick');
    } catch (error) {
      // Silently fail if sound doesn't play
      console.debug('Click sound failed to play:', error);
    }
  }, [playSound]);
  
  const withClickSound = useCallback((handler: () => void | Promise<void>) => {
    return async () => {
      await playClickSound();
      await handler();
    };
  }, [playClickSound]);
  
  return {
    playClickSound,
    withClickSound,
  };
}
