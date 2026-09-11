"use client";

import * as React from "react";
import { themeConfigs, type ThemeConfig } from "./tokens";

interface ProductThemeContextValue {
  theme: ThemeConfig;
  setTheme: (theme: ThemeConfig) => void;
}

const ProductThemeContext = React.createContext<ProductThemeContextValue | undefined>(undefined);

interface ProductThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: ThemeConfig;
  className?: string;
}

export function ProductThemeProvider({
  children,
  defaultTheme = themeConfigs.editorialLight,
  className = "",
}: ProductThemeProviderProps) {
  const [theme, setTheme] = React.useState<ThemeConfig>(defaultTheme);

  // Apply theme as scoped CSS variables on a wrapper element
  // This avoids leaking into the host application's styles
  const themeStyle = {
    "--product-background": theme.background,
    "--product-foreground": theme.foreground,
    "--product-secondary": theme.secondary,
    "--product-muted": theme.muted,
    "--product-border": theme.border,
    "--product-accent": theme.accent,
    "--product-accent-ink": theme.accentInk,
    "--product-focus": theme.accent,
    "--product-radius-control": theme.radius === "sharp" ? "8px" : "12px",
    "--product-radius-panel": "16px",
    "--product-radius-stage": "24px",
    "--product-font-display": "var(--font-manrope), sans-serif",
    "--product-font-body": "var(--font-inter), sans-serif",
    "--product-font-mono": "var(--font-jetbrains), monospace",
  } as React.CSSProperties;

  return (
    <ProductThemeContext.Provider value={{ theme, setTheme }}>
      <div
        className={`product-theme-root ${theme.name} ${theme.density} ${theme.radius} ${className}`}
        data-product-theme={theme.name}
        style={{ ...themeStyle, backgroundColor: "var(--product-background)", color: "var(--product-foreground)", fontFamily: "var(--product-font-body)" }}
      >
        {children}
      </div>
    </ProductThemeContext.Provider>
  );
}

export function useProductTheme() {
  const context = React.useContext(ProductThemeContext);
  if (context === undefined) {
    throw new Error("useProductTheme must be used within a ProductThemeProvider");
  }
  return context;
}
