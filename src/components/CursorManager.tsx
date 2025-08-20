import { useEffect } from 'react';
import { useGame } from '../store/game';

export function CursorManager() {
  const gamePhase = useGame((s) => s.gamePhase);

  useEffect(() => {
    const root = document.documentElement;
    
    
    if (gamePhase === 'playing' || gamePhase === 'rave' || gamePhase === 'raveEnd') {
      // Use gameplay cursor during gameplay and rave phases
      root.classList.add('cursor-gameplay');
      root.classList.remove('cursor-default');
    } else {
      // Use custom crab cursors for all other phases
      root.classList.remove('cursor-gameplay');
      root.classList.add('cursor-default');
    }
  }, [gamePhase]);

  return null;
}
