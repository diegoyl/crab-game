import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useGame } from '../store/game';
import { useSound } from './index';

export function SoundController() {
  const { playSound, stopSound, fadeOutSound, debugSounds } = useSound();
  const health = useGame((s) => s.health);
  const isFlipped = useGame((s) => s.isFlipped);
  const crabPos = useGame((s) => s.crabPos);
  const tideLevel = useGame((s) => s.tideLevel);
  const gamePhase = useGame((s) => s.gamePhase);
  const setRaveMusicStartTime = useGame((s) => s.setRaveMusicStartTime);
  const setGamePhase = useGame((s) => s.setGamePhase);
  
  // Track previous states to avoid unnecessary sound changes
  const prevHealthRef = useRef(health);
  const prevIsFlippedRef = useRef(isFlipped);
  const backgroundStartedRef = useRef(false);
  const drowningStartedRef = useRef(false);
  const raveMusicStartedRef = useRef(false);

  // Calculate if crab is in water (same logic as HealthSystem)
  const isInWater = (() => {
    const shorelineMin = -40;
    const shorelineMax = 8;
    const shorelineZ = THREE.MathUtils.lerp(shorelineMin, shorelineMax, tideLevel);
    return crabPos.z < shorelineZ;
  })();

  useEffect(() => {
    // Start background music and ambient sound when game starts
    if (!backgroundStartedRef.current && gamePhase === 'playing') {
      console.log('Attempting to play background music and ambient sound...');
      debugSounds(); // Debug what sounds are loaded
      playSound('backgroundMusic').catch(console.error);
      playSound('backgroundAmbient').catch(console.error);
      backgroundStartedRef.current = true;
    }
    
    // Stop background music and ambient sound when entering rave phase
    if (gamePhase === 'rave' && backgroundStartedRef.current) {
      console.log('Stopping background music and ambient sound for rave phase...');
      stopSound('backgroundMusic');
      stopSound('backgroundAmbient');
      backgroundStartedRef.current = false;
    }
  }, [playSound, stopSound, gamePhase, debugSounds]);

  // Handle rave music
  useEffect(() => {
    if (gamePhase === 'rave' && !raveMusicStartedRef.current) {
      console.log('Starting rave music...');
      raveMusicStartedRef.current = true;
      setRaveMusicStartTime(Date.now());
      playSound('raveMusic', {
        onEnded: () => {
          console.log('Rave music ended, transitioning to rave end phase...');
          raveMusicStartedRef.current = false;
          setGamePhase('raveEnd');
        }
      }).catch(console.error);
    } else if (gamePhase !== 'rave' && gamePhase !== 'raveEnd' && raveMusicStartedRef.current) {
      // Stop rave music when leaving rave phase (but not when transitioning to raveEnd)
      console.log('Stopping rave music...');
      stopSound('raveMusic');
      setRaveMusicStartTime(null);
      raveMusicStartedRef.current = false;
    }
  }, [gamePhase, playSound, stopSound, setRaveMusicStartTime, setGamePhase]);

  useEffect(() => {
    // Handle drowning sound when health reaches 0 (match flip threshold)
    const isDrowning = health <= 0.01;
    
    if (isDrowning && !drowningStartedRef.current && gamePhase === 'playing') {
      console.log('Attempting to play drowning sound...');
      debugSounds(); // Debug what sounds are loaded
      playSound('drowning').catch(console.error);
      drowningStartedRef.current = true;
    } else if (!isDrowning && drowningStartedRef.current) {
      // Fade out drowning sound over 1 second instead of stopping immediately
      fadeOutSound('drowning', 1.0);
      drowningStartedRef.current = false;
    }
  }, [health, playSound, stopSound, fadeOutSound, gamePhase, debugSounds]);

  // Stop drowning sound when game ends
  useEffect(() => {
    if ((gamePhase === 'gameOver' || gamePhase === 'ending') && drowningStartedRef.current) {
      console.log('Stopping drowning sound due to game end...');
      stopSound('drowning');
      drowningStartedRef.current = false;
    }
  }, [gamePhase, stopSound]);

  // Handle crab flip sound
  useEffect(() => {
    if (isFlipped && !prevIsFlippedRef.current && gamePhase === 'playing') {
      // Crab just flipped
      playSound('crabFlip').catch(console.error);
    } else if (!isFlipped && prevIsFlippedRef.current && gamePhase === 'playing') {
      // Crab just unflipped (revival)
      playSound('crabFlip').catch(console.error);
      playSound('crabRevival').catch(console.error);
    }
    
    prevIsFlippedRef.current = isFlipped;
  }, [isFlipped, playSound, gamePhase]);

  return null; // This component doesn't render anything
}
