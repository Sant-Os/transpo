/**
 * Apple HIG Color Palette
 * Basada en los tokens de color del sistema iOS (Light Mode)
 * Referencia: https://developer.apple.com/design/human-interface-guidelines/color
 */
export const colors = {
  // Backgrounds (iOS systemGroupedBackground)
  background: '#F2F2F7',
  secondaryBackground: '#FFFFFF',
  tertiaryBackground: '#F2F2F7',

  // Surfaces
  card: '#FFFFFF',
  surface: 'rgba(120, 120, 128, 0.12)',   // iOS tertiaryFill
  surfaceElevated: '#FFFFFF',

  // Text
  text: '#000000',
  textSecondary: '#8E8E93',                // iOS systemGray
  textTertiary: '#AEAEB2',                 // iOS systemGray3

  // Separators
  border: '#C6C6C8',                       // iOS separator opaque
  separator: 'rgba(60, 60, 67, 0.12)',     // iOS separator translucent
  separatorOpaque: '#C6C6C8',

  // System Colors (iOS)
  primary: '#007AFF',       // systemBlue
  success: '#34C759',       // systemGreen
  warning: '#FF9500',       // systemOrange
  danger: '#FF3B30',        // systemRed
  indigo: '#5856D6',        // systemIndigo
  purple: '#AF52DE',        // systemPurple
  teal: '#5AC8FA',          // systemTeal
  pink: '#FF2D55',          // systemPink

  // Tints (fondos translúcidos para selección)
  tint: 'rgba(0, 122, 255, 0.12)',
  tintSuccess: 'rgba(52, 199, 89, 0.12)',
  tintDanger: 'rgba(255, 59, 48, 0.12)',
  tintWarning: 'rgba(255, 149, 0, 0.12)',

  // Seat Status Colors
  seatFree: '#34C759',
  seatReserved: '#007AFF',
  seatOccupied: '#FF3B30',

  // Gradients
  gradientBlue: ['#007AFF', '#5856D6'],
  gradientGreen: ['#34C759', '#30D158'],
};
