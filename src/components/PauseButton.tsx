import { useGame } from '../store/game';
import './PauseButton.css';
import { useClickSound } from '../hooks/useClickSound';

interface PauseButtonProps {
  onPause: () => void;
}

export function PauseButton({ onPause }: PauseButtonProps) {
  const gamePhase = useGame((s) => s.gamePhase);
  const { withClickSound } = useClickSound();

  // Only show during gameplay
  if (gamePhase !== 'playing') return null;

  return (
    <button className="pause-button" onClick={withClickSound(onPause)}>
      <p>
        ||
      </p>
    </button>
  );
}
