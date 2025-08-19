import * as THREE from 'three';

// Color definitions in RGB format for IDE color picker support
// These get converted to hex for game use

const COLORS_RGB = {
  SAND: {
    BEACH: 'rgb(255, 206, 120)',      // Beach sand
    CASTLE: 'rgb(250, 190, 86)',    // Sand castle
  },
  WATER: {
    OCEAN: 'rgb(52, 201, 247)',      // Ocean water
  },
  CRAB: {
    BODY: 'rgb(255, 85, 72)',        // Crab body
    CLAWS: 'rgb(200, 50, 50)',       // Crab claws
  },
  UI: {
    HEALTH_BG: 'rgb(57, 36, 36)',    // Health bar background
    HEALTH_FILL: 'rgb(255, 85, 72)', // Health bar fill
    HEALTH_EMPTY: 'rgb(177, 136, 136)', // Health bar when empty
  },
  EFFECTS: {
    WATER_GLOW: 'rgb(64, 164, 223)', // Water effect on crab
    FLIPPED_GLOW: 'rgb(0, 81, 255)', // Red glow when flipped
    DISABLED_GLOW: 'rgb(13, 255, 0)', // Gray glow when disabled
    DUST: 'rgb(250, 250, 243)', // dust puff initial color
  },
  DECORATIVE: {
    FLAG_POLE: 'rgb(139, 69, 19)',   // Flag pole
    FLAG: 'rgb(255, 0, 0)',          // Flag
  },
  SHELLS: {
    CONCH: 'rgb(55, 138, 195)',     // Conch shell
    NAUTILUS: 'rgb(255, 138, 195)',  // Nautilus shell
    OIL: 'rgb(55, 138, 195)',          // Oil shell
  }
} as const;

// Convert RGB string to hex
function rgbToHex(rgb: string): string {
  // Extract RGB values from "rgb(r, g, b)" format
  const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) {
    console.warn(`Invalid RGB format: ${rgb}`);
    return '#000000';
  }
  
  const r = parseInt(match[1]);
  const g = parseInt(match[2]);
  const b = parseInt(match[3]);
  
  // Convert to hex
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Convert all RGB colors to hex for game use
const COLORS = {
  SAND: {
    BEACH: rgbToHex(COLORS_RGB.SAND.BEACH),
    CASTLE: rgbToHex(COLORS_RGB.SAND.CASTLE),
  },
  WATER: {
    OCEAN: rgbToHex(COLORS_RGB.WATER.OCEAN),
  },
  CRAB: {
    BODY: rgbToHex(COLORS_RGB.CRAB.BODY),
    CLAWS: rgbToHex(COLORS_RGB.CRAB.CLAWS),
  },
  UI: {
    HEALTH_BG: rgbToHex(COLORS_RGB.UI.HEALTH_BG),
    HEALTH_FILL: rgbToHex(COLORS_RGB.UI.HEALTH_FILL),
    HEALTH_EMPTY: rgbToHex(COLORS_RGB.UI.HEALTH_EMPTY),
  },
  EFFECTS: {
    WATER_GLOW: rgbToHex(COLORS_RGB.EFFECTS.WATER_GLOW),
    FLIPPED_GLOW: rgbToHex(COLORS_RGB.EFFECTS.FLIPPED_GLOW),
    DISABLED_GLOW: rgbToHex(COLORS_RGB.EFFECTS.DISABLED_GLOW),
    DUST: rgbToHex(COLORS_RGB.EFFECTS.DUST),
  },
  SHELLS: {
    CONCH: rgbToHex(COLORS_RGB.SHELLS.CONCH),
    NAUTILUS: rgbToHex(COLORS_RGB.SHELLS.NAUTILUS),
    OIL: rgbToHex(COLORS_RGB.SHELLS.OIL),
  }
} as const;

// Helper functions
function getColorWithOpacity(color: string, opacity: number): string {
  return color + Math.round(opacity * 255).toString(16).padStart(2, '0');
}

function getThreeColor(color: string): THREE.Color {
  return new THREE.Color(color);
}

export { COLORS, COLORS_RGB, getColorWithOpacity, getThreeColor };
