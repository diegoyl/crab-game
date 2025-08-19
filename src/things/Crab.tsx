import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '../store/game';
import { useGLTF } from '@react-three/drei';
import crabModelUrl from '../models/Crab.glb';
import { useSoundEvents } from '../sounds';

export function Crab() {
  const setCrabPos = useGame((s) => s.setCrabPos);
  const crabPos = useGame((s) => s.crabPos);
  const tideLevel = useGame((s) => s.tideLevel);
  const health = useGame((s) => s.health);
  const isFlipped = useGame((s) => s.isFlipped);
  const gamePhase = useGame((s) => s.gamePhase);
  const gameStartTime = useGame((s) => s.gameStartTime);
  const setGamePhase = useGame((s) => s.setGamePhase);
  const isPaused = useGame((s) => s.isPaused);
  const { playFootstep, playSound } = useSoundEvents();
  const group = useRef<THREE.Group>(null);
  const { camera, mouse } = useThree();
  const velocityRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const yawRef = useRef<number>(0);
  const flipAnimationRef = useRef<number>(isFlipped ? 1 : 0); // 0 = upright, 1 = flipped
  const animDirectionRef = useRef<number>(0); // -1 unflip to 0, +1 flip to 1, 0 idle
  const lastIsFlippedRef = useRef<boolean>(isFlipped);
  const animationDurationSeconds = 0.8; // total time for flip/unflip
  const wobbleTimeRef = useRef<number>(0); // Time for wobble animation
  
  // Mouse position for menu movement
  const mouseXRef = useRef<number>(0);
  const mouseYRef = useRef<number>(0);
  
  // Footstep sound tracking
  const footstepDistanceRef = useRef<number>(0); // Track distance traveled since last footstep
  const menuFootstepDistanceRef = useRef<number>(0); // Track distance for menu footsteps

  // Mouse and touch event listeners for menu movement
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      // Convert window coordinates to world coordinates
      const windowX = event.clientX;
      const windowY = event.clientY;
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const worldX = - ((windowX / windowWidth) * 18 - 9); // Convert to -50 to +50 range
      mouseXRef.current = worldX;
      mouseYRef.current = windowY;
    };

    const handleTouchMove = (event: TouchEvent) => {
      // Only prevent default if we're in a game phase that needs movement
      if (gamePhase === 'enter' || gamePhase === 'playing' || gamePhase === 'rave') {
        event.preventDefault(); // Prevent scrolling during gameplay
      }
      const touch = event.touches[0];
      const windowX = touch.clientX;
      const windowWidth = window.innerWidth;
      const worldX = - ((windowX / windowWidth) * 18 - 9); // Convert to -50 to +50 range
      mouseXRef.current = worldX;
    };

    const handleTouchStart = (event: TouchEvent) => {
      // Only prevent default if we're in a game phase that needs movement
      if (gamePhase === 'enter' || gamePhase === 'playing' || gamePhase === 'rave') {
        event.preventDefault(); // Prevent scrolling during gameplay
      }
      const touch = event.touches[0];
      const windowX = touch.clientX;
      const windowWidth = window.innerWidth;
      const worldX = - ((windowX / windowWidth) * 18 - 9); // Convert to -50 to +50 range
      mouseXRef.current = worldX;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchstart', handleTouchStart);
    };
  }, []);
  
  // Ending animation state
  const endingAnimationRef = useRef<{
    isActive: boolean;
    startPos: { x: number; z: number };
    targetPos: { x: number; z: number };
    startTime: number;
    duration: number;
    yellingPlayed: boolean;
    targetRotation: number;
  }>({
    isActive: false,
    startPos: { x: 0, z: 0 },
    targetPos: { x: 0, z: 50 },
    startTime: 0,
    duration: 0,
    yellingPlayed: false,
    targetRotation: 0,
  });

  // Jump animation state for rave phase
  const jumpAnimationRef = useRef<{
    isActive: boolean;
    startTime: number;
    duration: number;
    startY: number;
    peakY: number;
    lastMouseY: number;
  }>({
    isActive: false,
    startTime: 0,
    duration: 0,
    startY: 0,
    peakY: 0,
    lastMouseY: 0,
  });

  // Check if crab is in water using the same logic as Tide component
  const isInWater = useMemo(() => {
    // Water detection parameters (matching Tide.tsx)
    const TIDE_RANGE_MIN = 15;
    const TIDE_RANGE_MAX = -10;
    
    // Ocean box parameters (matching Tide.tsx)
    const TOTAL_BOXES = 52;
    const IN_BOUNDS_BOXES = 50;
    const BOX_WIDTH = 100 / IN_BOUNDS_BOXES + 0.15;
    const BOX_DEPTH = 200;
    
    // Wave parameters (matching Tide.tsx)
    const WAVE_AMPLITUDE = 5;
    const WAVE_FREQUENCY = 0.02;
    const WAVE_SPEED = 1;

    // Function to check if crab is in water by testing collision with ocean boxes
    const checkWaterCollision = (crabX: number, crabZ: number) => {
      // Check collision with each ocean box
      for (let i = 0; i < TOTAL_BOXES; i++) {
        let boxX, boxWidth;
        
        if (i === 0) {
          // Left out-of-bounds box
          boxX = -130;
          boxWidth = 160;
        } else if (i === TOTAL_BOXES - 1) {
          // Right out-of-bounds box
          boxX = 130;
          boxWidth = 160;
        } else {
          // In-bounds boxes
          const inBoundsIndex = i - 1;
          boxX = THREE.MathUtils.lerp(-50, 50, inBoundsIndex / (IN_BOUNDS_BOXES - 1));
          boxWidth = BOX_WIDTH;
        }
        
        // Calculate box Z position with wave animation (matching Tide.tsx exactly)
        const waveX = boxX * WAVE_FREQUENCY;
        const timePhase = Date.now() * 0.001 * WAVE_SPEED; // Use current time since we're in useMemo
        const phaseOffset = (boxX / 50) * Math.PI * 2 * (0.95 + Math.random() * 0.1);
        const waveOffset = Math.sin(waveX + tideLevel * Math.PI * 2 + phaseOffset + timePhase) * WAVE_AMPLITUDE;
        
        const tideZ = THREE.MathUtils.lerp(TIDE_RANGE_MIN, TIDE_RANGE_MAX, tideLevel);
        const boxZ = tideZ + waveOffset - BOX_DEPTH / 2; // Box center Z
        
        // Check if crab is within this box's bounds
        const boxHalfWidth = boxWidth / 2;
        const boxHalfDepth = BOX_DEPTH / 2;
        
        if (crabX >= boxX - boxHalfWidth && 
            crabX <= boxX + boxHalfWidth && 
            crabZ >= boxZ - boxHalfDepth && 
            crabZ <= boxZ + boxHalfDepth) {
          return true; // Crab is in water
        }
      }
      
      return false; // Crab is not in water
    };

    return checkWaterCollision(crabPos.x, crabPos.z);
  }, [crabPos.x, crabPos.z, tideLevel]);

  const gltf = useGLTF(crabModelUrl) as any;
  useEffect(() => {
    if (!gltf?.scene) return;
    gltf.scene.traverse((obj: any) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
  }, [gltf]);

  // Add visual effect when in water, disabled, or flipped

// EMISSION DISABLED FOR NOW
  // useEffect(() => {
  //   // Disable emission effects in pre-game and ending phase
  //   if (gamePhase !== 'playing') {
  //     return;
  //   }

  //   if (!gltf?.scene) return;
  //   gltf.scene.traverse((obj: any) => {
  //     if (obj.isMesh && obj.material) {
  //       if (isFlipped) {
  //         // blue glow when flipped (distressed state)
  //         obj.material.emissive = new THREE.Color(0x0022ff);
  //         obj.material.emissiveIntensity = 0.2;
  //       } else if (health <= 0.3 && isInWater) {
  //         // blue out when disabled
  //         obj.material.emissive = new THREE.Color(0x0022ff);
  //         obj.material.emissiveIntensity = 0.16 - health/2;
  //       } else {
  //         obj.material.emissive = new THREE.Color(0x000000);
  //         obj.material.emissiveIntensity = 0;
  //       }
  //     }
  //   });
  // }, [gltf, isInWater, health, isFlipped, gamePhase]);

  // Ensure crab starts in correct flipped state
  useEffect(() => {
    if (group.current) {
      group.current.position.set(crabPos.x, 0.0, crabPos.z);
      group.current.rotation.x = isFlipped ? Math.PI : 0;
      group.current.rotation.y = Math.PI;
    }
  }, [crabPos.x, crabPos.z, isFlipped]);

  useFrame((state, delta) => {
    // Skip crab updates if paused
    if (isPaused) return;
    
    if (gamePhase === 'loading'){
      setCrabPos(0, crabPos.z);
    }

    // During ending phase, force crab to be unflipped and skip flip animation
    if (gamePhase === 'ending') {
      // Force unflip state during ending
      if (isFlipped) {
        const setFlipped = useGame.getState().setFlipped;
        setFlipped(false);
      }
      // Skip flip animation logic during ending
    } else {
      // Drive flip animation with constant-time param for symmetry (only when not ending)
      if (isFlipped !== lastIsFlippedRef.current) {
        // Start a new animation toward the new target
        animDirectionRef.current = isFlipped ? 1 : -1;
        lastIsFlippedRef.current = isFlipped;
      }
    }

    if (gamePhase !== 'ending') {
      if (animDirectionRef.current !== 0) {
        const step = (delta / animationDurationSeconds) * animDirectionRef.current;
        flipAnimationRef.current = THREE.MathUtils.clamp(
          flipAnimationRef.current + step,
          0,
          1
        );
        // Stop when we reach the target
        if (
          (animDirectionRef.current > 0 && flipAnimationRef.current >= 1) ||
          (animDirectionRef.current < 0 && flipAnimationRef.current <= 0)
        ) {
          animDirectionRef.current = 0;
        }
      } else {
        // Snap to logical target if idle - ensure crab starts flipped
        const target = isFlipped ? 1 : 0;
        flipAnimationRef.current = target;
      }
    } else {
      // During ending phase, force crab to be upright
      flipAnimationRef.current = 0;
      animDirectionRef.current = 0;
    }

    // Apply flip animation to the group - ALWAYS do this
    if (group.current) {
      const progress = flipAnimationRef.current;
      
      // Set initial position
      group.current.position.set(crabPos.x, 0.4, crabPos.z);
      
      // Symmetrical animation: 50% up, 50% down, parabolic height
      let liftHeight = 0;
      let flipAngle = 0;
      
      if (progress > 0) {
        const maxHeight = 3; // Peak height
        // Parabolic arc: h(s) = 4*s*(1-s), s in [0,1]
        const s = progress;
        const heightNorm = 4 * s * (1 - s);
        liftHeight = maxHeight * heightNorm;
        
        // Rotation: start at 15%, finish at 85% (more centered)
        if (progress <= 0.15) {
          flipAngle = 0; // Not rotating yet
        } else if (progress >= 0.85) {
          flipAngle = Math.PI; // Fully rotated
        } else {
          // Rotate from 15% to 85% of animation
          const rotationProgress = (progress - 0.15) / 0.7;
          flipAngle = rotationProgress * Math.PI;
        }
      } else {
        // Normal state
        // no-op
      }
      
      group.current.rotation.x = flipAngle;
      group.current.position.y = 0.4 + liftHeight;
    }

    // Update wobble animation time
    wobbleTimeRef.current += delta;
    
    // Add wiggle animation when flipped (but not during ending)
    if (isFlipped && group.current && gamePhase !== 'ending') {
      // Wiggle animation parameters
      const wiggleFrequency = 10.0; // How fast the wiggle cycles
      const sideToSideAmplitude = 0.03; // Side-to-side tilt (radians)
      const backForwardAmplitude = 0.008; // Back-forward tilt (radians)
      
      // Create side-to-side wiggle (rotation around Z-axis)
      const sideWiggle = Math.sin(wobbleTimeRef.current * wiggleFrequency * 1.7) * sideToSideAmplitude*(Math.random()*0.8 + 0.4);
      
      // Create back-forward wiggle (rotation around X-axis)
      const backForwardWiggle = Math.sin(wobbleTimeRef.current * wiggleFrequency ) * backForwardAmplitude*(Math.random()*0.8 + 0.4) + 0.15;
      
      // Apply wiggle to the existing flip rotation
      group.current.rotation.z = sideWiggle;
      group.current.rotation.x = Math.PI + backForwardWiggle; // Math.PI is the flipped state
      // group.current.position.y = 0.3;
    }
    
    // Handle flipped crab rescue logic
    if ((gamePhase === 'playing' || gamePhase === 'rave') && isFlipped) {
      // Only move crab during rising tide phase (progress 0.0 to 0.5)
      const gameTime = (Date.now() - gameStartTime!) / 1000;
      const cycle = 10;
      const cycleProgress = (gameTime % cycle) / cycle;
      
      // For cycle 0, adjust progress since it starts at 0.5
      let adjustedCycleProgress = cycleProgress;
      if (Math.floor(gameTime / cycle) === 0) {
        adjustedCycleProgress = 0.5 + cycleProgress;
        if (adjustedCycleProgress > 1.0) {
          adjustedCycleProgress = 1.0;
        }
      }
      
      if (adjustedCycleProgress < 0.51) {

        // Rising tide phase - slowly move crab toward shore
        const rescueSpeed = 5.0; // units per second
        const newZ = crabPos.z + rescueSpeed * delta; // Move toward shore, but stay 2 units above current min
        setCrabPos(crabPos.x, newZ);
      }
      // During falling tide phase, maintain current position
      
      return; // Skip normal movement when flipped
    }

    // Disable movement when not in a movement phase or during unflip animation
    if (flipAnimationRef.current > 0.01) {
      return;
    }

    // Only allow movement in specific phases
    if (!['playing', 'ending', 'enter', 'rave'].includes(gamePhase)) {
      return;
    }

    if (gamePhase === 'playing') {
      // Raycast mouse to XZ ground plane at y=0
      state.raycaster.setFromCamera(mouse, camera);
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const hit = new THREE.Vector3();
      state.raycaster.ray.intersectPlane(plane, hit);

      
      // Parameters
      const maxSpeedUnitsPerSecond = 12; // hard speed cap (kept)
      const distanceAtMaxSpeed = 6; // reach max speed beyond this distance
      const deadzoneRadius = 0.8; // stop moving when pointer is very close
      const velocityDampingPerSecond = 10; // higher = snappier acceleration/deceleration
      const rotationDampingPerSecond = 3; // higher = faster rotation response

      // Desired velocity scales with distance, capped by max speed
      const currentPosition = new THREE.Vector3(crabPos.x, 0, crabPos.z);
      const targetPosition = new THREE.Vector3(hit.x, 0, hit.z);
      const toTarget = targetPosition.clone().sub(currentPosition);
      const distanceToTarget = toTarget.length();

      let desiredVelocity = new THREE.Vector3();
      if (distanceToTarget > deadzoneRadius) {
        // Ramp from 0 speed at deadzone edge to max speed at distanceAtMaxSpeed
        const ramp = Math.max(0, distanceToTarget - deadzoneRadius);
        const denom = Math.max(0.0001, distanceAtMaxSpeed - deadzoneRadius);
        const speedFraction = Math.min(1, ramp / denom);
        const desiredSpeed = maxSpeedUnitsPerSecond * speedFraction;
        desiredVelocity.copy(toTarget).normalize().multiplyScalar(desiredSpeed);
      } // else keep desiredVelocity at 0

      // Smooth velocity toward desired to avoid instant direction changes
      const v = velocityRef.current;
      // If very close to the pointer, increase damping to kill residual jitter quickly
      const dampingBoost = distanceToTarget < deadzoneRadius ? 2.5 : 1;
      const velAlpha = 1 - Math.exp(-delta * velocityDampingPerSecond * dampingBoost);
      v.lerp(desiredVelocity, velAlpha);
      // Clamp to max speed
      const vLen = v.length();
      if (vLen > maxSpeedUnitsPerSecond) v.multiplyScalar(maxSpeedUnitsPerSecond / vLen);
    


      // Calculate dynamic minimum Z bound based on current tide range
      const getMinZBound = () => {
        if ((gamePhase === 'playing' || gamePhase === 'rave') && gameStartTime !== null) {
          const gameTime = (Date.now() - gameStartTime) / 1000;
          const cycle = 10;
          const currentCycleIndex = Math.floor(gameTime / cycle);
          
          if (currentCycleIndex < 6) {
                        const increment = 0.4 / 6;  // 0.067 per cycle (same for min and max)
            const currentMin = currentCycleIndex * increment;
            // Convert to Z position: Z = -20 + (currentMin × 58)
            return -20 + (currentMin * 58);
          } else {
            // Final state
            return 36;
          }
        } else {
          // Pre-game: use -20 as minimum
          return -20;
        }
      };

      // Integrate position
      const nextPosition = currentPosition.add(v.clone().multiplyScalar(delta));
      // Clamp to beach plane bounds with dynamic minimum Z
      const minX = -50, maxX = 50;
      const minZ = getMinZBound(), maxZ = 38; // Dynamic minZ based on tide range
      nextPosition.x = Math.min(maxX, Math.max(minX, nextPosition.x));
      nextPosition.z = Math.min(maxZ, Math.max(minZ, nextPosition.z));
      setCrabPos(nextPosition.x, nextPosition.z);

      // Play footstep sounds when moving
      const currentSpeed = v.length();
      const isMoving = currentSpeed > 0.2; // Only play footsteps when moving fast enough
      
      if (isMoving && (gamePhase === 'playing')) {
        // Calculate distance traveled since last frame
        const distanceTraveled = currentSpeed * delta;
        footstepDistanceRef.current += distanceTraveled;
        
        // Play footstep every 1.5 units of distance traveled
        const footstepDistance = 1.3;
        if (footstepDistanceRef.current >= footstepDistance) {
          playFootstep({ x: nextPosition.x, z: nextPosition.z }, isInWater).catch(console.error);
          footstepDistanceRef.current = 0; // Reset distance counter
        }
      } else {
        // Reset distance counter when not moving
        footstepDistanceRef.current = 0;
      }

      if (group.current) {
        // Normal gameplay positioning
        group.current.position.set(nextPosition.x, 0.4, nextPosition.z);
        
        // Smooth rotation toward movement direction (only when not flipped)
        if (v.lengthSq() > 1e-6 && !isFlipped) {
          const desiredYaw = Math.atan2(v.x, v.z);
          const currentYaw = yawRef.current;
          // shortest angular difference
          const diff = Math.atan2(Math.sin(desiredYaw - currentYaw), Math.cos(desiredYaw - currentYaw));
          const rotAlpha = 1 - Math.exp(-delta * rotationDampingPerSecond);
          const newYaw = currentYaw + diff * rotAlpha;
          yawRef.current = newYaw;
          group.current.rotation.y = newYaw;
        }
        
        // Add wobble animation when moving (only when not flipped)
        if (v.length() > 0.5 && !isFlipped) {
          const currentSpeed = v.length();
          const maxSpeed = 12; // Maximum speed from movement parameters
          const speedFactor = Math.min(currentSpeed / maxSpeed, 1.0); // 0 to 1
          
          // Wobble frequency and amplitude based on speed
          const wobbleFrequency = 8.0; // How fast the wobble cycles
          const maxWobbleAmplitude = 0.04; // Maximum tilt angle in radians (~8.6 degrees)
          const wobbleAmplitude = maxWobbleAmplitude * speedFactor;
          
          // Create side-to-side wobble using sine wave
          const wobbleAngle = Math.sin(wobbleTimeRef.current * wobbleFrequency) * wobbleAmplitude;
          group.current.rotation.z = wobbleAngle;
        } else {
          // Gradually return to normal when not moving
          group.current.rotation.z = THREE.MathUtils.lerp(group.current.rotation.z, 0, delta * 5);
        }
      }
    }

    // Handle rave phase movement (mouse-following)
    if (gamePhase === 'rave' || gamePhase === 'raveEnd') {
      // Follow mouse horizontally with distance-based speed
      const targetX = - mouseXRef.current;
      const currentX = crabPos.x;
      const distance =  (targetX - currentX);
      // console.log('rvms: m,c: '+targetX.toFixed(1)+"  |  "+currentX.toFixed(1))
      
      
      if (Math.abs(distance) > 0.1) {
        // Ramp speed based on distance (similar to main menu)
        const maxSpeed = 8; // Slightly slower than main menu for rave
        const distanceAtMaxSpeed = 6;
        const deadzoneRadius = 0.8;
        
        let desiredSpeed = 0;
        if (Math.abs(distance) > deadzoneRadius) {
          const ramp = Math.max(0, Math.abs(distance) - deadzoneRadius);
          const denom = Math.max(0.0001, distanceAtMaxSpeed - deadzoneRadius);
          const speedFraction = Math.min(1, ramp / denom);
          desiredSpeed = maxSpeed * speedFraction;
        }
        
        const direction = distance > 0 ? 1 : -1;
        let newX = currentX + direction * desiredSpeed * delta;
        
        // Clamp crab position between -10 and 10 on X axis
        newX = Math.max(-10, Math.min(10, newX));
        
        // Fixed Z position at 32
        setCrabPos(newX, 32);
      }
      
      // Set crab position and rotation for rave phase
      if (group.current) {
        
        // Handle jump animation
        let yPosition = 1.8; // Default standing height
        
        if (jumpAnimationRef.current.isActive) {
          const elapsed = Date.now() - jumpAnimationRef.current.startTime;
          const progress = Math.min(elapsed / jumpAnimationRef.current.duration, 1.0);
          
          // Create a smooth jump curve (up and down)
          const jumpCurve = Math.sin(progress * Math.PI); // 0 -> 1 -> 0
          const jumpHeight = jumpAnimationRef.current.peakY - jumpAnimationRef.current.startY;
          yPosition = jumpAnimationRef.current.startY + (jumpHeight * jumpCurve);
          
          // End jump animation when complete
          if (progress >= 1.0) {
            jumpAnimationRef.current.isActive = false;
            yPosition = 1.8; // Return to standing height
          }
        }
        

        group.current.position.x = crabPos.x;
        group.current.position.y = yPosition;
        group.current.position.z = 32; // Fixed Z position
        group.current.rotation.x = -Math.PI/2; // -90 degrees on X-axis
        group.current.rotation.y = 0; // Reset Y rotation
        
        // Side-to-side tilt animation for rave phase
        const tiltTime = Date.now() * 0.001;
        const tiltFrequency = (2 * Math.PI) / 0.96; // 0.96 second cycle
        const baseTiltAngle = 0.3; // Base tilt angle in radians (~17 degrees)
        const randomFactor = 0.2; // Randomness factor (20% variation)
        
        // Create sine wave with slight randomness for Z-axis tilt
        const sineValue = Math.sin(tiltTime * tiltFrequency / 4);
        const randomOffset = Math.sin(tiltTime * 3.7) * randomFactor; // Different frequency for randomness
        const tiltAngle = (sineValue + randomOffset) * baseTiltAngle;
        
        // Y-axis rotation (twice as slow frequency)
        const yRotationFrequency = tiltFrequency / 2; // Half the frequency = twice as slow
        const baseYRotationAngle = 0.2; // Slightly smaller angle for Y rotation
        const ySineValue = Math.sin(tiltTime * yRotationFrequency);
        const yRandomOffset = Math.sin(tiltTime * 2.3) * randomFactor; // Different randomness frequency
        const yRotationAngle = (ySineValue + yRandomOffset) * baseYRotationAngle;
        
        group.current.rotation.z = tiltAngle;
        group.current.rotation.y = yRotationAngle;
      }
      
      // Jump detection - check for significant mouse Y movement
      const currentMouseY = mouseYRef.current;
      const jumpThreshold = -1001; // pixels
      const lastMouseY = jumpAnimationRef.current.lastMouseY || currentMouseY;
      
              const jumpHeightNorm = (lastMouseY - currentMouseY)
        
        // Map jumpHeightNorm from 0-400 to 0.5-5.0 and clamp
        let mappedJumpHeight = Math.max(0.4, Math.min(4.0, 
          (jumpHeightNorm / 100) * (4.0 - 0.4) + 0.4
        ));

        if (mappedJumpHeight < 0.5) {
          mappedJumpHeight += Math.random()*0.3;
        }
        
        // Detect upward mouse movement
        if (currentMouseY < lastMouseY - jumpThreshold && !jumpAnimationRef.current.isActive) {
          // Start jump animation
          jumpAnimationRef.current.isActive = true;
          jumpAnimationRef.current.startTime = Date.now();
          jumpAnimationRef.current.duration = 480; // 0.45 second jump
          jumpAnimationRef.current.startY = 1.8; // Current Y position
          jumpAnimationRef.current.peakY = 1.8 + mappedJumpHeight; // Dynamic peak jump height
        console.log('Jump! = '+mappedJumpHeight);
      } 
      
      // Update last mouse Y position
      jumpAnimationRef.current.lastMouseY = currentMouseY;
      
      // Skip normal movement logic during rave
      return;
    }


    // Handle menu movement (enter phase)
    if (gamePhase === 'enter') {
      // Follow mouse horizontally with distance-based speed
      const targetX = mouseXRef.current;
      const currentX = crabPos.x;
      const distance = targetX - currentX;
      
      if (Math.abs(distance) > 0.1) {
        // Ramp speed based on distance (similar to normal movement)
        const maxSpeed = 5;
        const distanceAtMaxSpeed = 6;
        const deadzoneRadius = 0.8;
        
        let desiredSpeed = 0;
        if (Math.abs(distance) > deadzoneRadius) {
          const ramp = Math.max(0, Math.abs(distance) - deadzoneRadius);
          const denom = Math.max(0.0001, distanceAtMaxSpeed - deadzoneRadius);
          const speedFraction = Math.min(1, ramp / denom);
          desiredSpeed = maxSpeed * speedFraction;
        }
        
        const direction = distance > 0 ? 1 : -1;
        let newX = currentX + direction * desiredSpeed * delta;
        
        // Clamp crab position between -10 and 10 on main menu
        newX = Math.max(-10, Math.min(10, newX));
        
        // Track distance for footstep sounds
        const distanceMoved = Math.abs(newX - currentX);
        menuFootstepDistanceRef.current += distanceMoved;
        
        // Play footstep sound every 2 units of movement
        if (menuFootstepDistanceRef.current >= 1.0) {
          playFootstep();
          menuFootstepDistanceRef.current = 0;
        }
        
        setCrabPos(newX, crabPos.z);
      }
      
      // Skip normal movement logic during menu
      return;
    } 


    // Handle ending animation
    if (gamePhase === 'ending') {
      const ending = endingAnimationRef.current;
      
      // Start the ending animation if not already active
      if (!ending.isActive) {
        // Calculate target rotation (facing towards target)
        const targetRotation = Math.atan2(0 - crabPos.x, 46 - crabPos.z);
        
        ending.isActive = true;
        ending.startPos = { x: crabPos.x, z: crabPos.z };
        ending.targetPos = { x: 0, z: 46 };
        ending.startTime = Date.now();
        ending.targetRotation = targetRotation;
        
        // Calculate duration based on distance (faster than max walk speed)
        const distance = Math.sqrt(
          Math.pow(ending.targetPos.x - ending.startPos.x, 2) + 
          Math.pow(ending.targetPos.z - ending.startPos.z, 2)
        );
        const runSpeed = 13; // Faster than max walk speed (12)
        ending.duration = distance / runSpeed * 1000; // Convert to milliseconds
        ending.yellingPlayed = false;
        
      }
      
      // Play yelling sound once when animation starts
      if (!ending.yellingPlayed) {
        playSound('yelling').catch(console.error);
        ending.yellingPlayed = true;
      }
      
      // Update animation progress
      const elapsed = Date.now() - ending.startTime;
      const progress = Math.min(elapsed / ending.duration, 1.0);
      
      // Smooth easing function
      const easedProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
      
      // Interpolate position
      const newX = ending.startPos.x + (ending.targetPos.x - ending.startPos.x) * easedProgress;
      const newZ = ending.startPos.z + (ending.targetPos.z - ending.startPos.z) * easedProgress;
      
      setCrabPos(newX, newZ);
      
      // Apply rotation to face target direction immediately
      if (group.current) {
        group.current.rotation.y = ending.targetRotation;
      }
      
      // Play footstep sounds during ending animation
      const currentSpeed = 8; // Constant speed during ending
      const distanceTraveled = currentSpeed * delta;
      footstepDistanceRef.current += distanceTraveled;
      
      const footstepDistance = 0.6;
      if (footstepDistanceRef.current >= footstepDistance) {
        playFootstep({ x: newX, z: newZ }, false).catch(console.error); // Regular footsteps, not wet
        footstepDistanceRef.current = 0;
      }
      
      // Check if animation is complete
      if (progress >= 1.0) {
        console.log('Ending animation complete, showing game over menu');
        // Add shells to total before showing game over menu
        const addShellsToTotal = useGame.getState().addShellsToTotal;
        addShellsToTotal();
        setGamePhase('gameOver');
        ending.isActive = false;
      }
      
      return; // Skip normal movement and footstep logic
    }

    

  });

  return (
    <group ref={group} scale={0.04}>
      {gltf?.scene ? <primitive object={gltf.scene} /> : null}
    </group>
  );
}


