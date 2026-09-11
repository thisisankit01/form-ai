// FORM Design Tokens - Exact values from PRD §3
// These are the source of truth for all styling

// Color tokens
export const colors = {
  ink: "#111111",
  inkRaised: "#1B1B1B",
  canvas: "#F5F4F0",
  surface: "#FFFFFF",
  surfaceMuted: "#ECEBE6",
  text: "#171717",
  textSecondary: "#60605B",
  textInverse: "#F8F7F3",
  textInverseSecondary: "#B8B7B1",
  line: "#D9D8D1",
  lineDark: "#373733",
  accent: "#DDF274",
  accentInk: "#20250A",
  success: "#246341",
  warning: "#81510A",
  danger: "#B32D2D",
  focus: "#3659D9",
};

// Radius tokens
export const radius = {
  control: "8px",
  panel: "16px",
  stage: "24px",
};

// Shadow tokens
export const shadows = {
  float: "0 12px 40px rgba(17, 17, 17, .09)",
  stage: "0 32px 100px rgba(0, 0, 0, .25)",
};

// Font tokens (will be used with next/font)
export const fonts = {
  display: "Manrope",
  sans: "Inter",
  mono: "JetBrains Mono",
};

// Theme presets from PRD §11
export const themePresets = {
  editorialLight: {
    name: "editorial-light",
    background: colors.canvas,
    foreground: colors.ink,
    secondary: colors.textSecondary,
    muted: colors.surfaceMuted,
    border: colors.line,
    accent: colors.accent,
    accentInk: colors.accentInk,
  },
  precisionDark: {
    name: "precision-dark",
    background: colors.ink,
    foreground: colors.textInverse,
    secondary: colors.textInverseSecondary,
    muted: colors.inkRaised,
    border: colors.lineDark,
    accent: colors.accent, // cobalt accent would be different
    accentInk: colors.accentInk,
  },
  warmService: {
    name: "warm-service",
    background: colors.surface,
    foreground: colors.ink,
    secondary: colors.textSecondary,
    muted: colors.surfaceMuted,
    border: colors.line,
    accent: colors.accent, // terracotta accent would be different
    accentInk: colors.accentInk,
  },
};

// Theme configurations
export const themeConfigs = {
  editorialLight: {
    ...themePresets.editorialLight,
    density: "comfortable",
    radius: "sharp",
  },
  precisionDark: {
    ...themePresets.precisionDark,
    density: "compact",
    radius: "sharp",
  },
  warmService: {
    ...themePresets.warmService,
    density: "comfortable",
    radius: "soft",
  },
};

export type ThemeConfig = typeof themeConfigs.editorialLight;
export type ThemePreset = keyof typeof themePresets;