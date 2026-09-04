// Design system for HiveTrack — extracted from Figma designs

export const Colors = {
  // Background
  cream: '#F5EDD8',
  creamDark: '#EDE0C4',

  // Primary amber
  primary: '#C8860A',
  primaryDark: '#A06808',
  primaryLight: '#F0A820',
  primaryButton: '#D4920D',

  // Text
  textDark: '#2D1800',
  textMedium: '#6B4C2A',
  textLight: '#9E7B52',
  textMuted: '#B89A70',

  // Borders & surfaces
  border: '#DEC89A',
  borderLight: '#EDD8A8',
  white: '#FFFFFF',
  inputBg: '#FFFFFF',

  // Status
  success: '#4CAF50',
  warning: '#FF9800',
  danger: '#E53935',

  // Tab inactive
  tabInactive: '#D4C4A0',
};

export const Typography = {
  // Font families (system fonts — matches Figma's feel)
  heading: 'Georgia', // serif for headings
  bodyFont: 'System',  // sans-serif for body

  // Sizes
  display: 32,
  h1: 28,
  h2: 22,
  h3: 18,
  bodySize: 15,
  small: 13,
  tiny: 11,

  // Weights
  bold: '700' as const,
  semibold: '600' as const,
  medium: '500' as const,
  regular: '400' as const,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};
