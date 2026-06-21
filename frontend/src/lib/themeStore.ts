type Theme = "light" | "dark";
type Listener = (theme: Theme) => void;

let currentTheme: Theme = "light";
const listeners = new Set<Listener>();

// Check for system preference if no stored theme
const getInitialTheme = (): Theme => {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem("portfolio-theme") as Theme | null;
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

// Initialize early to avoid flash
if (typeof window !== "undefined") {
  currentTheme = getInitialTheme();
  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(currentTheme);
}

export const themeStore = {
  getTheme: () => currentTheme,
  setTheme: (theme: Theme) => {
    if (theme === currentTheme) return;
    currentTheme = theme;
    if (typeof window !== "undefined") {
      localStorage.setItem("portfolio-theme", theme);
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(theme);
    }
    listeners.forEach((l) => {
      l(theme);
    });
  },
  subscribe: (listener: Listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
