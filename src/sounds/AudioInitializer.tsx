import { useEffect, useRef } from 'react';
import { useSound } from './index';

export function AudioInitializer() {
  const { initializeOnUserInteraction } = useSound();
  const initializedRef = useRef(false);

  useEffect(() => {
    const handleUserInteraction = async () => {
      if (initializedRef.current) return;
      
      initializedRef.current = true;
      await initializeOnUserInteraction();
      
      // Remove event listeners after initialization
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };

    // Add event listeners for user interaction
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);

    return () => {
      // Cleanup event listeners
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, [initializeOnUserInteraction]);

  return null; // This component doesn't render anything
}
