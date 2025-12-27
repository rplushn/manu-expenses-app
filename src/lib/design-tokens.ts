// design-tokens.ts - Sistema de diseño Minna
export const COLORS = {
  // Principales
  black: '#000000',
  white: '#FFFFFF',
  
  // Grises
  gray100: '#F5F5F5',
  gray200: '#E5E5E5',
  gray300: '#D4D4D4',
  gray400: '#A3A3A3',
  gray500: '#737373',
  gray600: '#525252',
  gray700: '#404040',
  gray800: '#262626',
  gray900: '#171717',
  
  // Estados
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  
  // Texto
  textPrimary: '#000000',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textDisabled: '#CCCCCC',
  
  // Backgrounds
  bgPrimary: '#FFFFFF',
  bgSecondary: '#F9FAFB',
  bgTertiary: '#F5F5F5',
  
  // Borders
  border: '#E5E5E5',
  borderStrong: '#262626',
  borderFocus: '#000000',
} as const;

export const TYPOGRAPHY = {
  // Headers
  h1: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 36,
    color: COLORS.textPrimary,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
    color: COLORS.textPrimary,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
    color: COLORS.textPrimary,
  },
  h4: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
    color: COLORS.textPrimary,
  },
  
  // Body
  bodyLarge: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
    color: COLORS.textPrimary,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 22,
    color: COLORS.textPrimary,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
  
  // Labels
  label: {
    fontSize: 13,
    fontWeight: '500' as const,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
  labelSmall: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
    color: COLORS.textTertiary,
  },
  
  // Special
  caption: {
    fontSize: 11,
    fontWeight: '400' as const,
    lineHeight: 14,
    color: COLORS.textTertiary,
  },
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const BORDERS = {
  width: {
    thin: 1,
    medium: 1.5,
    thick: 2,
  },
  radius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
} as const;

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;

export const LAYOUT = {
  screenPadding: 20,
  cardSpacing: 12,
  sectionSpacing: 24,
} as const;
