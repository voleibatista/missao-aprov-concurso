/**
 * Design tokens for MISSÃO APROV CONCURSO.
 * Following iOS-Native Clean personality with Forest Green / Emerald brand.
 */
export const colors = {
  surface: '#FAFAFA',
  onSurface: '#171717',
  surfaceSecondary: '#FFFFFF',
  onSurfaceSecondary: '#404040',
  surfaceTertiary: '#F5F5F5',
  onSurfaceTertiary: '#525252',
  surfaceInverse: '#171717',
  onSurfaceInverse: '#FAFAFA',
  brand: '#166534',
  brandPrimary: '#059669',
  onBrandPrimary: '#FFFFFF',
  brandSecondary: '#D1FAE5',
  onBrandSecondary: '#065F46',
  brandTertiary: '#ECFDF5',
  onBrandTertiary: '#047857',
  success: '#10B981',
  onSuccess: '#FFFFFF',
  warning: '#F59E0B',
  onWarning: '#FFFFFF',
  error: '#EF4444',
  onError: '#FFFFFF',
  info: '#737373',
  border: '#E5E5E5',
  borderStrong: '#D4D4D4',
  divider: '#F5F5F5',
  // extras
  muted: '#A3A3A3',
  overlay: 'rgba(23,23,23,0.55)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
};

export const radius = { sm: 6, md: 12, lg: 20, pill: 999 };

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  h3: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodyStrong: { fontSize: 15, fontWeight: '600' as const },
  small: { fontSize: 13, fontWeight: '400' as const },
  caption: { fontSize: 11, fontWeight: '500' as const, letterSpacing: 0.4 },
  metricLg: { fontSize: 32, fontWeight: '800' as const, letterSpacing: -0.8 },
  metricMd: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.4 },
};

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
};
