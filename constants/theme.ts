/**
 * LockInPhase design tokens.
 *
 * The palette is a warm near-black ramp ("ink") with a bone off-white for text
 * and an ember accent. Warm neutrals keep the accent, the XP gold and the
 * success sage in the same family, so the UI reads as one surface rather than a
 * set of unrelated status colors.
 */

const palette = {
  // Canvas through raised surfaces. Each step is a real elevation level:
  // ink900 is the screen, ink800 is a card, ink700 sits on top of a card.
  ink900: '#0D0C0B',
  ink800: '#171614',
  ink700: '#211F1C',
  ink600: '#2C2A26',
  ink500: '#3C3933',

  bone100: '#F4F2EF',
  bone300: '#A8A39B',
  bone500: '#6A6762',

  ember: '#E8622C',
  gold: '#E8B33C',
  sage: '#5BBE7E',
  brick: '#D94F4F',
  slate: '#5F6B7A',
} as const;

export const Colors = {
  // Surfaces
  background: palette.ink900,
  primary: palette.ink800,
  surface: palette.ink800,
  surfaceRaised: palette.ink700,
  secondary: palette.ink700,
  inputBg: palette.ink700,
  border: palette.ink600,
  borderStrong: palette.ink500,
  overlay: 'rgba(8, 7, 6, 0.72)',

  // Text
  textPrimary: palette.bone100,
  textSecondary: palette.bone300,
  textMuted: palette.bone500,

  // Brand + status
  accent: palette.ember,
  gold: palette.gold,
  green: palette.sage,
  red: palette.brick,

  // Priority
  priorityUrgent: palette.brick,
  priorityImportant: palette.gold,
  priorityLow: palette.slate,

  // Tinted fills and borders. These replace the `Colors.accent + '20'` string
  // concatenation pattern, which silently breaks on any non-hex color.
  accentFaint: 'rgba(232, 98, 44, 0.08)',
  accentSubtle: 'rgba(232, 98, 44, 0.14)',
  accentBorder: 'rgba(232, 98, 44, 0.32)',
  accentTrack: 'rgba(232, 98, 44, 0.45)',

  goldSubtle: 'rgba(232, 179, 60, 0.13)',
  goldBorder: 'rgba(232, 179, 60, 0.30)',

  greenSubtle: 'rgba(91, 190, 126, 0.14)',
  greenBorder: 'rgba(91, 190, 126, 0.32)',

  redSubtle: 'rgba(217, 79, 79, 0.14)',
  redBorder: 'rgba(217, 79, 79, 0.38)',

  slateSubtle: 'rgba(95, 107, 122, 0.18)',
  borderFaint: 'rgba(44, 42, 38, 0.55)',

  mutedFaint: 'rgba(168, 163, 155, 0.08)',
  mutedBorder: 'rgba(168, 163, 155, 0.24)',

  recessed: 'rgba(8, 7, 6, 0.35)',

  // Contribution heatmap, lightest to most active.
  heat0: palette.ink700,
  heat1: 'rgba(91, 190, 126, 0.22)',
  heat2: 'rgba(91, 190, 126, 0.42)',
  heat3: 'rgba(91, 190, 126, 0.68)',
  heat4: palette.sage,
} as const;

/**
 * Tint a hex token at a given opacity. Only accepts #RRGGBB, which is why the
 * static tints above are stored as rgba() rather than built by concatenation.
 */
export function withAlpha(hex: string, opacity: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/** 4pt spacing scale. `screen` is the shared horizontal screen gutter. */
export const Spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 40,
  huge: 48,
  hero: 80,
  screen: 20,
} as const;

export const Radius = {
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  xxl: 16,
  pill: 999,
} as const;

/**
 * Space Grotesk carries its own weights, so styles name a weighted family
 * instead of pairing a single family with `fontWeight`. Mixing the two makes
 * Android synthesize a faux-bold on top of an already-bold face.
 */
export const Fonts = {
  regular: 'SpaceGrotesk_400Regular',
  medium: 'SpaceGrotesk_500Medium',
  semibold: 'SpaceGrotesk_600SemiBold',
  bold: 'SpaceGrotesk_700Bold',
} as const;

/** Nine-step type scale. Spread these into styles: `...Type.heading`. */
export const Type = {
  display: { fontFamily: Fonts.bold, fontSize: 32, lineHeight: 36, letterSpacing: -0.8 },
  title: { fontFamily: Fonts.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.4 },
  heading: { fontFamily: Fonts.semibold, fontSize: 18, lineHeight: 24, letterSpacing: -0.2 },
  subheading: { fontFamily: Fonts.semibold, fontSize: 16, lineHeight: 22, letterSpacing: -0.1 },
  body: { fontFamily: Fonts.regular, fontSize: 15, lineHeight: 21 },
  bodyStrong: { fontFamily: Fonts.medium, fontSize: 15, lineHeight: 21 },
  label: { fontFamily: Fonts.medium, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: Fonts.medium, fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
  micro: { fontFamily: Fonts.semibold, fontSize: 11, lineHeight: 14, letterSpacing: 0.4 },
  /** Tabular-feeling stat readouts. */
  stat: { fontFamily: Fonts.bold, fontSize: 18, lineHeight: 22, letterSpacing: -0.3 },
} as const;
