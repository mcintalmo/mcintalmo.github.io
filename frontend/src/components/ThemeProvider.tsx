import { createContext, useContext, useEffect, useState } from "react";
import { themeStore } from "../lib/themeStore";

type Theme = "light" | "dark";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

// Initial state from store
const initialState: ThemeProviderState = {
  theme: themeStore.getTheme(),
  setTheme: (t) => themeStore.setTheme(t),
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(themeStore.getTheme());

  useEffect(() => {
    // Sync React state with global store
    const unsubscribe = themeStore.subscribe((newTheme) => {
      setTheme(newTheme);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Apply theme to document root
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
  }, [theme]);

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      themeStore.setTheme(newTheme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  // Default to store if context is somehow missing or using initialState
  const [currentTheme, setCurrentTheme] = useState(
    context ? context.theme : themeStore.getTheme(),
  );

  useEffect(() => {
    // Synchronize with global store in all cases
    const unsubscribe = themeStore.subscribe((newTheme) => {
      setCurrentTheme(newTheme);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  return {
    theme: currentTheme,
    setTheme: (newTheme: Theme) => themeStore.setTheme(newTheme),
  };
};
