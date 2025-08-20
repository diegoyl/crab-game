import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Sound types
export type SoundType = 
  | 'footstep'
  | 'wetFootstep'
  | 'shellCollection'
  | 'crabFlip'
  | 'crabRevival'
  | 'backgroundAmbient'
  | 'drowning'
  | 'backgroundMusic'
  | 'raveMusic'
  | 'yelling'
  | 'uiClick';

// Sound configuration
export interface SoundConfig {
  volume: number;
  loop: boolean;
  spatial: boolean;
}

// Default sound configurations
export const SOUND_CONFIGS: Record<SoundType, SoundConfig> = {
  footstep: { volume: 1.0, loop: false, spatial: true },
  wetFootstep: { volume: 0.8, loop: false, spatial: true },
  shellCollection: { volume: 0.3, loop: false, spatial: false },
  crabFlip: { volume: 0.6, loop: false, spatial: false },
  crabRevival: { volume: 0.7, loop: false, spatial: false },
  backgroundAmbient: { volume: 0.35, loop: true, spatial: false },
  drowning: { volume: 0.15, loop: true, spatial: false },
  backgroundMusic: { volume: 0.4, loop: true, spatial: false },
  raveMusic: { volume: 0.5, loop: true, spatial: false },
  yelling: { volume: 0.4, loop: false, spatial: false },
  uiClick: { volume: 1.0, loop: false, spatial: false },
};

// Extended AudioBufferSourceNode with gain node reference
interface AudioSourceWithGain extends AudioBufferSourceNode {
  gainNode?: GainNode;
}

// Sound manager state
interface SoundState {
  // Audio contexts and buffers
  audioContext: AudioContext | null;
  sounds: Map<string, AudioBuffer>;
  currentLoops: Map<string, AudioSourceWithGain>;
  
  // Settings
  musicVolume: number;
  soundEffectsVolume: number;
  musicEnabled: boolean;
  soundEffectsEnabled: boolean;
  
  // Methods
  initialize: () => Promise<void>;
  initializeOnUserInteraction: () => Promise<void>;
  loadSound: (name: string, url: string) => Promise<void>;
  playSound: (type: SoundType, options?: { position?: { x: number; z: number }; onEnded?: () => void }) => Promise<void>;
  stopSound: (type: SoundType) => void;
  fadeOutSound: (type: SoundType, duration?: number) => void;
  stopAllSounds: () => void;
  setMusicVolume: (volume: number) => void;
  setSoundEffectsVolume: (volume: number) => void;
  setMusicEnabled: (enabled: boolean) => void;
  setSoundEffectsEnabled: (enabled: boolean) => void;
  debugSounds: () => void;
  
  // Footstep management
  footstepIndex: number;
  playFootstep: (position?: { x: number; z: number }) => void;
}

export const useSound = create<SoundState>()(
  persist(
    (set, get) => ({
  audioContext: null,
  sounds: new Map(),
  currentLoops: new Map(),
  musicVolume: 0.7,
  soundEffectsVolume: 1.0,
  musicEnabled: true,
  soundEffectsEnabled: true,
  footstepIndex: 0,

  initialize: async () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Resume context if suspended (required for autoplay policies)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      set({ audioContext });
      console.log('Sound system initialized');
    } catch (error) {
      console.error('Failed to initialize sound system:', error);
    }
  },

  // Initialize audio context on user interaction
  initializeOnUserInteraction: async () => {
    const { audioContext } = get();
    if (audioContext) return; // Already initialized
    
    try {
      const newAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      set({ audioContext: newAudioContext });
      console.log('Audio context initialized on user interaction');
      
      // Load any pending sounds that were stored as URLs
      const { sounds } = get();
      const pendingSounds = Array.from(sounds.entries())
        .filter(([_, buffer]) => buffer && typeof buffer === 'object' && 'url' in buffer)
        .map(([name, buffer]) => ({ name, url: (buffer as any).url }));
      
      console.log(`Loading ${pendingSounds.length} pending sounds...`);
      for (const { name, url } of pendingSounds) {
        await get().loadSound(name, url);
      }
      console.log('All pending sounds loaded');
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
    }
  },

  loadSound: async (name: string, url: string) => {
    const { audioContext } = get();
    if (!audioContext) {
      console.log(`Storing URL for later loading: ${name}`);
      // Store the URL to load later when audio context is available
      set((state) => {
        const newSounds = new Map(state.sounds);
        newSounds.set(name, { url } as any); // Store URL temporarily
        return { sounds: newSounds };
      });
      return;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`Failed to fetch sound ${name}: ${response.status} ${response.statusText}`);
        return;
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      set((state) => {
        const newSounds = new Map(state.sounds);
        newSounds.set(name, audioBuffer);
        return { sounds: newSounds };
      });
      
      console.log(`Successfully loaded sound: ${name} (duration: ${audioBuffer.duration.toFixed(2)}s)`);
    } catch (error) {
      console.warn(`Failed to load sound ${name}:`, error);
      // Don't throw error, just log it
    }
  },

  playSound: async (type: SoundType, options = {}) => {
    const { audioContext, sounds, currentLoops, musicVolume, soundEffectsVolume, musicEnabled, soundEffectsEnabled } = get();
    
    // Check if this sound type should be played based on enabled settings
    const isMusic = type === 'backgroundMusic';
    if (isMusic && !musicEnabled) return;
    if (!isMusic && !soundEffectsEnabled) return;
    
    // Initialize audio context if not available
    if (!audioContext) {
      await get().initializeOnUserInteraction();
      return; // The sound will be played on the next call after initialization
    }

    const config = SOUND_CONFIGS[type];
    let soundName: string;
    if (type === 'footstep') {
      soundName = `footstep_${get().footstepIndex + 1}`;
    } else if (type === 'wetFootstep') {
      soundName = `wet_${get().footstepIndex + 1}`;
    } else {
      soundName = type;
    }
    const buffer = sounds.get(soundName);
    
    if (!buffer || !(buffer instanceof AudioBuffer)) {
      console.warn(`Sound not loaded: ${soundName} (type: ${typeof buffer})`);
      return;
    }


    const source = audioContext.createBufferSource();
    const gainNode = audioContext.createGain();
    
    source.buffer = buffer;
    source.loop = config.loop;
    
    // Apply volume based on sound type
    const volumeMultiplier = isMusic ? musicVolume : soundEffectsVolume;
    const finalVolume = config.volume * volumeMultiplier;
    gainNode.gain.setValueAtTime(finalVolume, audioContext.currentTime);
    
    // Connect nodes
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Handle spatial audio for footsteps
    if (config.spatial && options.position) {
      // Simple stereo panning based on X position
      const panner = audioContext.createStereoPanner();
      const panValue = Math.max(-1, Math.min(1, options.position.x / 50)); // Normalize to -1 to 1
      panner.pan.setValueAtTime(panValue, audioContext.currentTime);
      
      source.connect(panner);
      panner.connect(gainNode);
    }
    
    // Store looping sounds with gain node reference for fadeout
    if (config.loop) {
      // Store both source and gain node for fadeout functionality
      const sourceWithGain = source as AudioSourceWithGain;
      sourceWithGain.gainNode = gainNode;
      
      set((state) => {
        const newLoops = new Map(state.currentLoops);
        newLoops.set(type, sourceWithGain);
        return { currentLoops: newLoops };
      });
    }
    
    source.start();
    
    // Clean up non-looping sounds
    if (!config.loop) {
      source.onended = () => {
        // Clean up nodes
        source.disconnect();
        gainNode.disconnect();
        
        // Call onEnded callback if provided
        if (options?.onEnded) {
          options.onEnded();
        }
      };
    }
  },

  stopSound: (type: SoundType) => {
    const { currentLoops } = get();
    const source = currentLoops.get(type);
    
    if (source) {
      source.stop();
      set((state) => {
        const newLoops = new Map(state.currentLoops);
        newLoops.delete(type);
        return { currentLoops: newLoops };
      });
    }
  },

  fadeOutSound: (type: SoundType, duration = 1.0) => {
    const { currentLoops, audioContext } = get();
    const source = currentLoops.get(type);
    
    if (source && audioContext) {
      const gainNode = source.gainNode;
      if (gainNode) {
        const currentTime = audioContext.currentTime;
        const currentVolume = gainNode.gain.value;
        
        // Fade out over the specified duration
        gainNode.gain.setValueAtTime(currentVolume, currentTime);
        gainNode.gain.linearRampToValueAtTime(0, currentTime + duration);
        
        // Stop the source after fadeout
        setTimeout(() => {
          source.stop();
          set((state) => {
            const newLoops = new Map(state.currentLoops);
            newLoops.delete(type);
            return { currentLoops: newLoops };
          });
        }, duration * 1000);
      }
    }
  },

  stopAllSounds: () => {
    const { currentLoops } = get();
    currentLoops.forEach((source) => {
      source.stop();
    });
    set({ currentLoops: new Map() });
  },

  setMusicVolume: (volume: number) => {
    const { currentLoops, audioContext, musicEnabled } = get();
    const clampedVolume = Math.max(0, Math.min(1, volume));
    
    // Update volume for currently playing music
    const source = currentLoops.get('backgroundMusic');
    if (source && source.gainNode && audioContext && musicEnabled) {
      const targetVolume = clampedVolume * SOUND_CONFIGS.backgroundMusic.volume;
      source.gainNode.gain.setValueAtTime(targetVolume, audioContext.currentTime);
    }
    
    set({ musicVolume: clampedVolume });
  },

  setSoundEffectsVolume: (volume: number) => {
    const { currentLoops, audioContext, soundEffectsEnabled } = get();
    const clampedVolume = Math.max(0, Math.min(1, volume));
    
    // Update volume for currently playing sound effects
    ['backgroundAmbient', 'drowning'].forEach(type => {
      const source = currentLoops.get(type as SoundType);
      if (source && source.gainNode && audioContext && soundEffectsEnabled) {
        const config = SOUND_CONFIGS[type as SoundType];
        const targetVolume = clampedVolume * config.volume;
        source.gainNode.gain.setValueAtTime(targetVolume, audioContext.currentTime);
      }
    });
    
    set({ soundEffectsVolume: clampedVolume });
  },

  setMusicEnabled: (enabled: boolean) => {
    const { currentLoops, audioContext, musicVolume } = get();
    const source = currentLoops.get('backgroundMusic');
    
    if (source && source.gainNode && audioContext) {
      const targetVolume = enabled ? musicVolume * SOUND_CONFIGS.backgroundMusic.volume : 0;
      source.gainNode.gain.setValueAtTime(targetVolume, audioContext.currentTime);
    }
    
    set({ musicEnabled: enabled });
  },

  setSoundEffectsEnabled: (enabled: boolean) => {
    const { currentLoops, audioContext, soundEffectsVolume } = get();
    
    // Update volume for looping sound effects
    ['backgroundAmbient', 'drowning'].forEach(type => {
      const source = currentLoops.get(type as SoundType);
      if (source && source.gainNode && audioContext) {
        const config = SOUND_CONFIGS[type as SoundType];
        const targetVolume = enabled ? soundEffectsVolume * config.volume : 0;
        source.gainNode.gain.setValueAtTime(targetVolume, audioContext.currentTime);
      }
    });
    
    set({ soundEffectsEnabled: enabled });
  },

  // Debug function to check loaded sounds
  debugSounds: () => {
    const { sounds, audioContext } = get();
    console.log('=== Sound Debug Info ===');
    console.log(`Audio Context: ${audioContext ? 'Available' : 'Not available'}`);
    console.log(`Total sounds stored: ${sounds.size}`);
    
    sounds.forEach((buffer, name) => {
      if (buffer instanceof AudioBuffer) {
        console.log(`✓ ${name}: AudioBuffer (${buffer.duration.toFixed(2)}s)`);
      } else if (buffer && typeof buffer === 'object' && 'url' in buffer) {
        console.log(`⏳ ${name}: Pending URL (${(buffer as any).url})`);
      } else {
        console.log(`❓ ${name}: Unknown type (${typeof buffer})`);
      }
    });
    console.log('=======================');
  },

  playFootstep: async (position?: { x: number; z: number }, isInWater = false) => {
    const { footstepIndex } = get();
    const nextIndex = Math.floor(Math.random() * 8); // 8 footstep sounds
    
    set({ footstepIndex: nextIndex });
    const soundType = isInWater ? 'wetFootstep' : 'footstep';
    await get().playSound(soundType, { position });
  },
}),
{
  name: 'crab-sound-settings',
  partialize: (state) => ({ 
    musicVolume: state.musicVolume, 
    soundEffectsVolume: state.soundEffectsVolume, 
    musicEnabled: state.musicEnabled, 
    soundEffectsEnabled: state.soundEffectsEnabled 
  })
}
));

// Sound event hooks
export const useSoundEvents = () => {
  const playSound = useSound((s) => s.playSound);
  const stopSound = useSound((s) => s.stopSound);
  
  return {
    playSound: async (type: SoundType, options?: { position?: { x: number; z: number } }) => {
      await playSound(type, options);
    },
    stopSound,
    playFootstep: async (position?: { x: number; z: number }, isInWater?: boolean) => {
      const { footstepIndex } = useSound.getState();
      const nextIndex = Math.floor(Math.random() * 8); // 8 footstep sounds
      
      useSound.setState({ footstepIndex: nextIndex });
      const soundType = isInWater ? 'wetFootstep' : 'footstep';
      await playSound(soundType, { position });
    },
  };
};
