export type GraphicsQuality = 'low' | 'medium' | 'high' | 'ultra' | 'extreme';
export type BoardThemeId = 'royal_obsidian' | 'heritage_walnut' | 'emerald_pavilion' | 'arctic_sapphire';
export type ViewDimension = '2d' | '3d';

export interface GraphicsPreset {
  id: GraphicsQuality;
  label: string;
  description: string;
  resolutionScale: number;
  maxTextureSize: number;
  shadowMapSize: number;
  shadowsEnabled: boolean;
  antiAlias: boolean;
  particlesEnabled: boolean;
  particleCountMultiplier: number;
  resolutionTag: string;
}

export const GRAPHICS_PRESETS: Record<GraphicsQuality, GraphicsPreset> = {
  low: {
    id: 'low',
    label: 'Low',
    description: 'Battery saver · 512p textures · Flat lighting',
    resolutionScale: 0.85,
    maxTextureSize: 512,
    shadowMapSize: 0,
    shadowsEnabled: false,
    antiAlias: false,
    particlesEnabled: false,
    particleCountMultiplier: 0,
    resolutionTag: '512p Optimized',
  },
  medium: {
    id: 'medium',
    label: 'Medium',
    description: 'Balanced 60fps · 1K textures · Soft shadows',
    resolutionScale: 1.0,
    maxTextureSize: 1024,
    shadowMapSize: 512,
    shadowsEnabled: true,
    antiAlias: true,
    particlesEnabled: true,
    particleCountMultiplier: 0.6,
    resolutionTag: '1K HD',
  },
  high: {
    id: 'high',
    label: 'High',
    description: 'Crisp Retina · 2K textures · Dynamic lighting',
    resolutionScale: 1.5,
    maxTextureSize: 2048,
    shadowMapSize: 1024,
    shadowsEnabled: true,
    antiAlias: true,
    particlesEnabled: true,
    particleCountMultiplier: 1.0,
    resolutionTag: '2K QHD',
  },
  ultra: {
    id: 'ultra',
    label: 'Ultra',
    description: '4K procedural textures · Studio PBR & full particles',
    resolutionScale: 2.0,
    maxTextureSize: 4096,
    shadowMapSize: 2048,
    shadowsEnabled: true,
    antiAlias: true,
    particlesEnabled: true,
    particleCountMultiplier: 1.5,
    resolutionTag: '4K UHD',
  },
  extreme: {
    id: 'extreme',
    label: 'Extreme',
    description: 'Optional 8K streamed textures (auto-capped to device GPU)',
    resolutionScale: 2.5,
    maxTextureSize: 8192,
    shadowMapSize: 4096,
    shadowsEnabled: true,
    antiAlias: true,
    particlesEnabled: true,
    particleCountMultiplier: 2.0,
    resolutionTag: '8K Master',
  },
};

export interface BoardTheme {
  id: BoardThemeId;
  name: string;
  subtitle: string;
  tableBg: string;
  boardFrame: string;
  boardFrameTrim: string;
  trackLight: string;
  trackAlt: string;
  trackBorder: string;
  yardInnerBg: string;
  signboardBg: string;
  signboardText: string;
  signboardBorder: string;
  threeTableHex: number;
  threeFrameHex: number;
  threeTrimHex: number;
  threeTileHex: number;
}

export const BOARD_THEMES: Record<BoardThemeId, BoardTheme> = {
  royal_obsidian: {
    id: 'royal_obsidian',
    name: 'Royal Obsidian',
    subtitle: 'Obsidian stone & brushed championship gold',
    tableBg: '#0B0F17',
    boardFrame: '#151B26',
    boardFrameTrim: '#D4AF37',
    trackLight: '#F4F5F7',
    trackAlt: '#E5E7EB',
    trackBorder: '#CBD5E1',
    yardInnerBg: '#0F1520',
    signboardBg: '#101520',
    signboardText: '#F3D06B',
    signboardBorder: '#C9A227',
    threeTableHex: 0x0b0f17,
    threeFrameHex: 0x161d2b,
    threeTrimHex: 0xd4af37,
    threeTileHex: 0xf1f5f9,
  },
  heritage_walnut: {
    id: 'heritage_walnut',
    name: 'Heritage Walnut',
    subtitle: 'Hand-rubbed mahogany & ivory parlor inlay',
    tableBg: '#19110D',
    boardFrame: '#3B2316',
    boardFrameTrim: '#C89B54',
    trackLight: '#FAF3E6',
    trackAlt: '#EFE2CA',
    trackBorder: '#D4BFA0',
    yardInnerBg: '#2A180F',
    signboardBg: '#24140C',
    signboardText: '#E8C589',
    signboardBorder: '#B78846',
    threeTableHex: 0x18100c,
    threeFrameHex: 0x3f2517,
    threeTrimHex: 0xc89b54,
    threeTileHex: 0xfaf3e6,
  },
  emerald_pavilion: {
    id: 'emerald_pavilion',
    name: 'Emerald Pavilion',
    subtitle: 'Tournament baize felt & marble borders',
    tableBg: '#081814',
    boardFrame: '#0D2E25',
    boardFrameTrim: '#E2C06D',
    trackLight: '#F3F7F5',
    trackAlt: '#E0EBE5',
    trackBorder: '#BBD0C5',
    yardInnerBg: '#09221B',
    signboardBg: '#081C17',
    signboardText: '#F1D48A',
    signboardBorder: '#C7A24E',
    threeTableHex: 0x071713,
    threeFrameHex: 0x0f3329,
    threeTrimHex: 0xe2c06d,
    threeTileHex: 0xf2f7f5,
  },
  arctic_sapphire: {
    id: 'arctic_sapphire',
    name: 'Arctic Sapphire',
    subtitle: 'Brushed platinum slate & cool alabaster',
    tableBg: '#0B1320',
    boardFrame: '#172336',
    boardFrameTrim: '#94A3B8',
    trackLight: '#F8FAFC',
    trackAlt: '#E2E8F0',
    trackBorder: '#CBD5E1',
    yardInnerBg: '#0F1929',
    signboardBg: '#0E1726',
    signboardText: '#E2E8F0',
    signboardBorder: '#64748B',
    threeTableHex: 0x0b1320,
    threeFrameHex: 0x1a273b,
    threeTrimHex: 0xaab8cc,
    threeTileHex: 0xf8fafc,
  },
};

/** Safe GPU texture resolution cap so Extreme 8K never crashes low-end phones */
export function resolveSafeTextureSize(preset: GraphicsPreset, maxGpuTextureSize = 4096): number {
  return Math.min(preset.maxTextureSize, maxGpuTextureSize);
}
