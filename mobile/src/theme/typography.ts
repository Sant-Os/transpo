/**
 * Apple HIG Typography Scale
 * Fuente: Inter (sustituto multiplataforma de SF Pro)
 * Referencia: https://developer.apple.com/design/human-interface-guidelines/typography
 */
export const typography = {
  // Font families
  fontFamily: 'Inter_400Regular',
  fontFamilyMedium: 'Inter_500Medium',
  fontFamilySemiBold: 'Inter_600SemiBold',
  fontFamilyBold: 'Inter_700Bold',

  // Apple HIG Scale
  largeTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 34,
    lineHeight: 41,
    letterSpacing: 0.37,
  },
  title1: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: 0.36,
  },
  title2: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: 0.35,
  },
  title3: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 20,
    lineHeight: 25,
    letterSpacing: 0.38,
  },
  headline: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.41,
  },
  body: {
    fontFamily: 'Inter_400Regular',
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.41,
  },
  callout: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.32,
  },
  subhead: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.24,
  },
  footnote: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.08,
  },
  caption1: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0,
  },
  caption2: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    lineHeight: 13,
    letterSpacing: 0.07,
  },

  // Legacy aliases (para compatibilidad durante la migración)
  h1: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    lineHeight: 34,
  },
  h2: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    lineHeight: 28,
  },
  h3: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 20,
    lineHeight: 25,
  },
  caption: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  mono: {
    fontFamily: 'Inter_400Regular',
  },
};
