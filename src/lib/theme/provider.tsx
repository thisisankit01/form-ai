"use client";

import * as React from "react";
import { themeConfigs, type ThemeConfig } from "./tokens";

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: ThemeConfig;
}

const ThemeContext = React.createContext<ThemeConfig | undefined>(undefined);

export function ThemeProvider({ children, defaultTheme = themeConfigs.editorialLight }: ThemeProviderProps) {
  const [theme] = React.useState<ThemeConfig>(defaultTheme);

  // Apply theme classes to root element
  React.useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    
    // Clear existing theme classes
    root.className = root.className.replace(/theme-\S+/g, "").trim();
    
    // Add new theme classes
    root.className += ` theme-${theme.name}`;
    
    // Set CSS custom properties for tokens
    root.style.setProperty("--color-background", theme.background);
    root.style.setProperty("--color-foreground", theme.foreground);
    root.style.setProperty("--color-accent", theme.accent);
    
    // Density and radius - theme already has these properties from themeConfigs
    root.style.setProperty("--radius-control", theme.radius === "sharp" ? "8px" : "12px");
    root.style.setProperty("--radius-panel", "16px");
    root.style.setProperty("--radius-stage", "24px");
    
    return () => {
      // Cleanup on unmount
      root.className = root.className.replace(/theme-\S+/g, "").trim();
    };
  }, [theme]);

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
