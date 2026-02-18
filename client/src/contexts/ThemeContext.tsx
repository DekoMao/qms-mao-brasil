import React, { createContext, useContext, useEffect } from "react";

type Theme = "dark";

interface ThemeContextType {
  theme: Theme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: "dark" }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
