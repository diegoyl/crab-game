import { useEffect, useState } from 'react';
import './ShellsPopup.css';

interface ShellsPopupProps {
  totalShells: number;
  isVisible: boolean;
  onHide: () => void;
}

export function ShellsPopup({ totalShells, isVisible, onHide }: ShellsPopupProps) {
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShowPopup(true);
      const timer = setTimeout(() => {
        setShowPopup(false);
        setTimeout(onHide, 200); // Wait for fade out animation
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onHide]);

  if (!isVisible) return null;

  return (
    <div className={`shells-notification ${showPopup ? 'visible' : ''}`}>
      You only have {totalShells} shells
    </div>
  );
}
