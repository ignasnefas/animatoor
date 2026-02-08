/**
 * Retro color palettes for dithering effects
 */

export type PaletteType =
  | 'full'
  | 'nes'
  | 'gameboy'
  | 'commodore64'
  | 'atari2600'
  | 'zxspectrum'
  | 'amstradcpc'
  | 'apple2'
  | 'grayscale';

export interface Palette {
  name: string;
  colors: [number, number, number][];
}

// Full RGB palette (no reduction)
const fullPalette: Palette = {
  name: 'Full Color (No Reduction)',
  colors: generateFullPalette(),
};

// NES - Nintendo Entertainment System (64 colors)
const nesPalette: Palette = {
  name: 'NES',
  colors: [
    [84, 84, 84],
    [0, 30, 116],
    [8, 16, 144],
    [48, 0, 136],
    [68, 0, 100],
    [92, 0, 48],
    [84, 4, 0],
    [60, 24, 0],
    [32, 42, 0],
    [8, 58, 0],
    [0, 64, 0],
    [0, 60, 0],
    [0, 50, 60],
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
    [152, 150, 152],
    [8, 76, 196],
    [48, 50, 236],
    [92, 30, 228],
    [136, 20, 176],
    [160, 20, 100],
    [152, 34, 32],
    [120, 60, 0],
    [84, 90, 0],
    [40, 114, 0],
    [8, 124, 0],
    [0, 118, 40],
    [0, 102, 120],
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
    [236, 238, 236],
    [76, 154, 236],
    [120, 124, 236],
    [176, 98, 236],
    [228, 84, 236],
    [236, 88, 180],
    [236, 106, 100],
    [212, 136, 32],
    [160, 170, 0],
    [116, 196, 0],
    [76, 208, 32],
    [56, 204, 108],
    [56, 180, 204],
    [60, 60, 60],
    [0, 0, 0],
    [0, 0, 0],
    [236, 238, 236],
    [168, 204, 236],
    [188, 188, 236],
    [212, 178, 236],
    [236, 174, 236],
    [236, 174, 212],
    [236, 180, 176],
    [228, 196, 144],
    [204, 210, 120],
    [180, 222, 120],
    [168, 226, 144],
    [152, 226, 180],
    [160, 214, 228],
    [160, 162, 160],
    [0, 0, 0],
    [0, 0, 0],
  ],
};

// Game Boy - Original Dot Matrix gray palette
const gameBoypPalette: Palette = {
  name: 'Game Boy',
  colors: [
    [155, 188, 15],
    [139, 172, 15],
    [48, 98, 48],
    [15, 56, 15],
  ],
};

// Game Boy Color - More vibrant
const gameBoyCPalette: Palette = {
  name: 'Game Boy Color',
  colors: [
    [255, 255, 255],
    [170, 170, 170],
    [85, 85, 85],
    [0, 0, 0],
    [255, 100, 100],
    [255, 50, 50],
    [200, 0, 0],
    [100, 0, 0],
    [255, 200, 0],
    [255, 150, 0],
    [200, 100, 0],
    [100, 50, 0],
    [0, 200, 0],
    [0, 150, 0],
    [0, 100, 0],
    [0, 0, 200],
  ],
};

// Commodore 64 (16 colors)
const commodore64Palette: Palette = {
  name: 'Commodore 64',
  colors: [
    [0, 0, 0],
    [255, 255, 255],
    [136, 0, 0],
    [170, 255, 238],
    [204, 51, 153],
    [0, 204, 85],
    [0, 0, 170],
    [238, 238, 119],
    [221, 136, 85],
    [102, 68, 0],
    [221, 119, 119],
    [102, 102, 102],
    [153, 153, 153],
    [170, 255, 102],
    [0, 136, 255],
    [187, 187, 187],
  ],
};

// Atari 2600 (128 colors available, using a subset)
const atari2600Palette: Palette = {
  name: 'Atari 2600',
  colors: [
    [0, 0, 0],
    [68, 68, 68],
    [136, 136, 136],
    [204, 204, 204],
    [255, 0, 0],
    [255, 68, 68],
    [255, 136, 136],
    [255, 204, 204],
    [136, 68, 0],
    [204, 102, 0],
    [255, 170, 0],
    [255, 221, 136],
    [0, 102, 0],
    [68, 170, 68],
    [136, 221, 136],
    [204, 255, 204],
    [0, 0, 136],
    [68, 68, 204],
    [136, 136, 255],
    [204, 204, 255],
    [136, 0, 136],
    [204, 68, 204],
    [255, 136, 255],
    [255, 204, 255],
    [0, 136, 136],
    [68, 204, 204],
    [136, 255, 255],
    [204, 255, 255],
  ],
};

// ZX Spectrum (15 colors + black)
const zxSpectrumPalette: Palette = {
  name: 'ZX Spectrum',
  colors: [
    [0, 0, 0],
    [0, 0, 215],
    [215, 0, 0],
    [215, 0, 215],
    [0, 215, 0],
    [0, 215, 215],
    [215, 215, 0],
    [215, 215, 215],
    [0, 0, 0],
    [0, 0, 255],
    [255, 0, 0],
    [255, 0, 255],
    [0, 255, 0],
    [0, 255, 255],
    [255, 255, 0],
    [255, 255, 255],
  ],
};

// Amstrad CPC (27 colors: 3x3x3 RGB with 2 levels per channel)
const amstradCPCPalette: Palette = {
  name: 'Amstrad CPC',
  colors: [
    [0, 0, 0],
    [0, 0, 127],
    [0, 127, 0],
    [0, 127, 127],
    [127, 0, 0],
    [127, 0, 127],
    [127, 127, 0],
    [127, 127, 127],
    [0, 0, 255],
    [0, 255, 0],
    [0, 255, 255],
    [255, 0, 0],
    [255, 0, 255],
    [255, 127, 0],
    [127, 255, 0],
    [255, 255, 0],
    [255, 255, 127],
    [255, 255, 255],
    [0, 0, 0],
    [127, 127, 255],
    [127, 255, 127],
    [127, 255, 255],
    [255, 127, 127],
    [255, 127, 255],
    [255, 255, 0],
    [127, 127, 127],
    [127, 127, 127],
  ],
};

// Apple II (16 colors)
const apple2Palette: Palette = {
  name: 'Apple II',
  colors: [
    [0, 0, 0],
    [194, 100, 176],
    [96, 49, 151],
    [255, 102, 194],
    [0, 100, 176],
    [100, 100, 100],
    [102, 204, 255],
    [200, 150, 200],
    [96, 139, 39],
    [255, 102, 0],
    [150, 150, 150],
    [255, 179, 102],
    [0, 176, 0],
    [204, 255, 102],
    [100, 200, 100],
    [255, 255, 102],
  ],
};

// Grayscale (4-level)
const grayscale4Palette: Palette = {
  name: 'Grayscale (4-level)',
  colors: [
    [0, 0, 0],
    [85, 85, 85],
    [170, 170, 170],
    [255, 255, 255],
  ],
};

// Grayscale (8-level)
const grayscale8Palette: Palette = {
  name: 'Grayscale (8-level)',
  colors: [
    [0, 0, 0],
    [36, 36, 36],
    [73, 73, 73],
    [109, 109, 109],
    [146, 146, 146],
    [182, 182, 182],
    [219, 219, 219],
    [255, 255, 255],
  ],
};

/**
 * Generate a full RGB palette with ~256 colors
 */
function generateFullPalette(): [number, number, number][] {
  const colors: [number, number, number][] = [];
  // Use reduced levels for performance (4 levels per channel = 64 colors)
  // or 5 levels per channel = 125 colors
  const levels = 5;
  const step = 255 / (levels - 1);
  for (let r = 0; r < levels; r++) {
    for (let g = 0; g < levels; g++) {
      for (let b = 0; b < levels; b++) {
        colors.push([
          Math.round(r * step),
          Math.round(g * step),
          Math.round(b * step),
        ]);
      }
    }
  }
  return colors;
}

export const palettes: Record<PaletteType, Palette> = {
  full: fullPalette,
  nes: nesPalette,
  gameboy: gameBoypPalette,
  commodore64: commodore64Palette,
  atari2600: atari2600Palette,
  zxspectrum: zxSpectrumPalette,
  amstradcpc: amstradCPCPalette,
  apple2: apple2Palette,
  grayscale: grayscale4Palette,
};

export const paletteList: { value: PaletteType; label: string }[] = [
  { value: 'full', label: 'Full Color' },
  { value: 'nes', label: 'NES' },
  { value: 'gameboy', label: 'Game Boy' },
  { value: 'commodore64', label: 'Commodore 64' },
  { value: 'atari2600', label: 'Atari 2600' },
  { value: 'zxspectrum', label: 'ZX Spectrum' },
  { value: 'amstradcpc', label: 'Amstrad CPC' },
  { value: 'apple2', label: 'Apple II' },
  { value: 'grayscale', label: 'Grayscale' },
];
