"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type ThemeMode = "dark" | "light";

type ThemeContextValue = {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("dark");

  // Load saved theme on first mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("rk_theme");
      if (saved === "dark" || saved === "light") setThemeState(saved);
    } catch {}
  }, []);

  // Apply theme attribute + persist
  useEffect(() => {
    try {
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("rk_theme", theme);
    } catch {}
  }, [theme]);

  const api = useMemo<ThemeContextValue>(() => {
    return {
      theme,
      setTheme: (t) => setThemeState(t),
      toggleTheme: () => setThemeState((p) => (p === "dark" ? "light" : "dark")),
    };
  }, [theme]);

  return <ThemeContext.Provider value={api}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Safe fallback so the app doesn't crash even if provider isn't mounted
    return {
      theme: "dark" as ThemeMode,
      setTheme: () => {},
      toggleTheme: () => {},
    };
  }
  return ctx;
}
