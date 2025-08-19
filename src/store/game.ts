import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TidePhase = 'low' | 'rising' | 'high' | 'falling';

export type Shell = {
  id: number;
  x: number;
  z: number;
  collected: boolean;
};

type GameState = {
  crabPos: { x: number; z: number };
  tidePhase: TidePhase;
  tideLevel: number; // 0..1 smooth tide amount
  gameStartTime: number | null; // When the game started (for tide calculations)
  shells: Shell[];
  score: number;
  highScore: number;
  totalShells: number; // Total shells collected across all games
  health: number; // 0..1 health value
  isFlipped: boolean; // Whether the crab is flipped on its back
  gamePhase: 'enter' | 'loading' | 'ready' | 'playing' | 'ending' | 'gameOver' | 'rave' | 'raveEnd'; // Game flow phases
  isPaused: boolean; // Whether the game is paused
  raveMusicStartTime: number | null; // When rave music started (for timing effects)
  setCrabPos: (x: number, z: number) => void;
  setTide: (p: TidePhase) => void;
  setTideLevel: (v: number) => void;
  setGameStartTime: (time: number | null) => void;
  setShells: (shells: Shell[]) => void;
  markCollected: (id: number) => void;
  addScore: (v: number) => void;
  addShellsToTotal: () => void; // Add current score to total shells
  useShellsForRave: () => boolean; // Use 50 shells for rave mode, returns success
  setHealth: (health: number) => void;
  setFlipped: (flipped: boolean) => void;
  setGamePhase: (phase: 'enter' | 'loading' | 'ready' | 'playing' | 'ending' | 'gameOver' | 'rave' | 'raveEnd') => void;
  setPaused: (paused: boolean) => void;
  setRaveMusicStartTime: (time: number | null) => void;
  startLoading: () => void;
  finishLoading: () => void;
  startGame: () => void;
  resetRun: () => void;
  restartGame: () => void; // Skip loading for subsequent games
  resetHighScore: () => void;
};

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      crabPos: { x: 0, z: 34 }, // Updated to be within new beach bounds
      tidePhase: 'low',
      tideLevel: 0,
      gameStartTime: null,
      shells: [],
      score: 0,
      highScore: 0,
      totalShells: 0, // Start with 0 total shells
      health: 1, // Start with full health
      isFlipped: false, // Start upright for main menu
      gamePhase: 'enter', // Start with enter phase
      isPaused: false, // Start not paused
      raveMusicStartTime: null, // No rave music time initially
      setCrabPos: (x, z) => set({ crabPos: { x, z } }),
      setTide: (p) => set({ tidePhase: p }),
      setTideLevel: (v) => set({ tideLevel: v }),
      setGameStartTime: (time) => set({ gameStartTime: time }),
      setShells: (shells) => set({ shells }),
      markCollected: (id) =>
        set((s) => ({ shells: s.shells.map((sh) => (sh.id === id ? { ...sh, collected: true } : sh)) })),
      addScore: (v) => {
        const next = get().score + v;
        set({ score: next, highScore: Math.max(next, get().highScore) });
      },
      addShellsToTotal: () => {
        const currentScore = get().score;
        set((s) => ({ totalShells: s.totalShells + currentScore }));
      },
      useShellsForRave: () => {
        const currentTotal = get().totalShells;
        if (currentTotal >= 50) {
          set({ totalShells: currentTotal - 50 });
          return true; // Success
        }
        return false; // Not enough shells
      },
      setHealth: (health) => set({ health: Math.max(0, Math.min(1, health)) }),
      setFlipped: (flipped) => set({ isFlipped: flipped }),
      setGamePhase: (phase) => set({ gamePhase: phase }),
      setPaused: (paused) => set({ isPaused: paused }),
      setRaveMusicStartTime: (time) => set({ raveMusicStartTime: time }),
      startLoading: () => set({ gamePhase: 'loading', crabPos: { x: 0, z: 20 }, isFlipped: true }),
      finishLoading: () => set({ gamePhase: 'ready' }),
      startGame: () => set({ gamePhase: 'playing', isFlipped: true, gameStartTime: Date.now() }),
      resetRun: () => set({ score: 0, tidePhase: 'low', gameStartTime: null, crabPos: { x: 0, z: 34 }, health: 1, isFlipped: false, gamePhase: 'enter', isPaused: false, shells: get().shells.map(shell => ({ ...shell, collected: false })) }),
      restartGame: () => set({ score: 0, tidePhase: 'low', gameStartTime: null, crabPos: { x: 0, z: 34 }, health: 1, isFlipped: true, gamePhase: 'ready', shells: get().shells.map(shell => ({ ...shell, collected: false })) }),
      resetHighScore: () => set({ highScore: 0 }),
    }),
    {
      name: 'crab-game',
      partialize: (state) => ({ highScore: state.highScore, totalShells: state.totalShells })
    }
  )
);


