/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    text: '#1D1D22',
    tint: '#FF6B57',
    background: '#F7F5F2',
    foreground: '#1D1D22',
    card: '#FFFFFF',
    cardForeground: '#1D1D22',
    primary: '#FF6B57',
    primaryForeground: '#FFFFFF',
    secondary: '#EFECE8',
    secondaryForeground: '#3D3A3F',
    muted: '#E8E4DF',
    mutedForeground: '#777279',
    accent: '#F4C95D',
    accentForeground: '#26242A',
    destructive: '#D9504F',
    destructiveForeground: '#FFFFFF',
    border: '#E3DED8',
    input: '#E3DED8',
  },
  dark: {
    text: '#F7F3EF',
    tint: '#FF715D',
    background: '#101013',
    foreground: '#F7F3EF',
    card: '#1A1A1F',
    cardForeground: '#F7F3EF',
    primary: '#FF715D',
    primaryForeground: '#171418',
    secondary: '#25242A',
    secondaryForeground: '#E9E4E0',
    muted: '#2D2B32',
    mutedForeground: '#A6A0A7',
    accent: '#F4C95D',
    accentForeground: '#201C1A',
    destructive: '#F06A64',
    destructiveForeground: '#FFFFFF',
    border: '#302E35',
    input: '#3A373F',
  },
  radius: 8,
};

export default colors;
