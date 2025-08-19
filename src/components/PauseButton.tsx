import { useGame } from '../store/game';
import './PauseButton.css';

interface PauseButtonProps {
  onPause: () => void;
}

export function PauseButton({ onPause }: PauseButtonProps) {
  const gamePhase = useGame((s) => s.gamePhase);

  // Only show during gameplay
  if (gamePhase !== 'playing') return null;

  return (
    <button className="pause-button" onClick={onPause}>
      <p>
        ||
      </p>
    </button>
  );
}
