import { useEffect, useState } from 'react';

export function FullscreenManager() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if device is mobile
    const checkMobile = () => {
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(mobile);
      
      // Add mobile class to body for CSS targeting
      if (mobile) {
        document.body.classList.add('mobile-device');
        
        // Check initial orientation
        if (window.orientation === 0 || window.orientation === 180) {
          document.body.classList.add('portrait-mode');
        } else {
          document.body.classList.remove('portrait-mode');
        }
        
        // Show fullscreen prompt on mobile after a short delay
        setTimeout(() => {
          setShowFullscreenPrompt(true);
        }, 2000);
      }
    };

    checkMobile();

    // Handle fullscreen changes
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      if (document.fullscreenElement) {
        setShowFullscreenPrompt(false);
      }
    };

    // Handle orientation changes
    const handleOrientationChange = () => {
      if (window.orientation === 90 || window.orientation === -90) {
        setShowFullscreenPrompt(false);
        document.body.classList.remove('portrait-mode');
      } else if (window.orientation === 0 || window.orientation === 180) {
        document.body.classList.add('portrait-mode');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  const requestFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      } else if ((document.documentElement as any).webkitRequestFullscreen) {
        await (document.documentElement as any).webkitRequestFullscreen();
      } else if ((document.documentElement as any).msRequestFullscreen) {
        await (document.documentElement as any).msRequestFullscreen();
      }
    } catch (error) {
      console.log('Fullscreen request failed:', error);
    }
  };

  const exitFullscreen = async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen();
      }
    } catch (error) {
      console.log('Exit fullscreen failed:', error);
    }
  };

  if (!isMobile) return null;

  return (
    <>
      {/* Fullscreen prompt overlay */}
      {showFullscreenPrompt && !isFullscreen && (
        <div className="fullscreen-prompt">
          <div className="fullscreen-prompt-content">
            <h3>🎮 Better Gaming Experience</h3>
            <p>For the best experience, please:</p>
            <ul>
              <li>📱 Rotate your device to landscape</li>
              <li>🔲 Tap the fullscreen button below</li>
              <li>🎯 Or add to home screen for app-like experience</li>
            </ul>
            <div className="fullscreen-buttons">
              <button 
                className="fullscreen-button primary"
                onClick={requestFullscreen}
              >
                🔲 Enter Fullscreen
              </button>
              <button 
                className="fullscreen-button secondary"
                onClick={() => setShowFullscreenPrompt(false)}
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen toggle button */}
      <button 
        className={`fullscreen-toggle ${isFullscreen ? 'exit' : 'enter'}`}
        onClick={isFullscreen ? exitFullscreen : requestFullscreen}
        title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
      >
        {isFullscreen ? '⛌' : '🔲'}
      </button>
    </>
  );
}
