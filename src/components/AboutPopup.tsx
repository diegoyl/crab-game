import './AboutPopup.css';
import { useState } from 'react';
import { useClickSound } from '../hooks/useClickSound';

interface AboutPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutPopup({ isOpen, onClose }: AboutPopupProps) {
  const [showCopied, setShowCopied] = useState(false);
  const { withClickSound } = useClickSound();
  
  if (!isOpen) return null;

  return (
    <div className="popup-overlay" onClick={withClickSound(onClose)}>
      <div className="popup-modal" onClick={(e) => e.stopPropagation()}>
        <button className="popup-close-button" onClick={withClickSound(onClose)}>
          X
        </button>
        
        <div className="popup-content">
          <div className="about-content">
            <h3 className="about-section-title">About Reji's Rave</h3>
            <p className="about-paragraph">
              Reji is crab who loves to rave! Help him collect seashells so he can request the DJ to play his favorite song. But be careful because Reji is terrified of water and will pass out if he spends too much time in the ocean...
            </p>
                          <p className="about-paragraph">
                I made this game after I started using threejs and wanted to try out react-three-fiber. I kept the gameplay pretty simple for now, but I might add more features later (levels, powerups, obstacles). If you find any bugs or have any thoughts, let me know by emailing{' '}
                <button 
                  className="email-link"
                  onClick={withClickSound(() => {
                    navigator.clipboard.writeText('hi.diegoyl@gmail.com');
                    setShowCopied(true);
                    setTimeout(() => setShowCopied(false), 1000);
                  })}
                  title="Click to copy email"
                >
                  hi.diegoyl@gmail.com
                </button>
              </p>
            
            <h3 className="about-section-title">Credits</h3>
            <p className="about-paragraph">
              <span className="about-highlight">Designer & Developer:</span> Diego Yañez-Laguna<br/>
              <span className="about-highlight">Music:</span> Samba de Orfeu - Luiz Bonfa, Crab Rave - Noisestorm<br/>
              <span className="about-highlight">3D Models:</span> Poly Pizza 
              (<a href="https://poly.pizza/m/2DgM36qZW2u" target="_blank" rel="noopener noreferrer">Crab</a>, <a href="https://poly.pizza/m/5ovn4mnRejL" target="_blank" rel="noopener noreferrer">Shell</a>)<br/>
              <span className="about-highlight">Font:</span> Darumadrop One - Google Fonts<br/>
            </p>
            
            <p className="about-version">
              v1.0 — August 2025
            </p>
          </div>
        </div>
        
        {/* Copied notification */}
        {showCopied && (
          <div className="copied-notification">
            Copied!
          </div>
        )}
      </div>
    </div>
  );
}
