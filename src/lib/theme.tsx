import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  resolved: "light" | "dark";
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(t: "light" | "dark") {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", t === "dark");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  useEffect(() => {
    const saved = (typeof localStorage !== "undefined" && localStorage.getItem("thawani-theme")) as Theme | null;
    if (saved === "light" || saved === "dark" || saved === "system") {
      setThemeState(saved);
    }
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const compute = () => {
      const r = theme === "system" ? (mq.matches ? "dark" : "light") : theme;
      setResolved(r);
      applyTheme(r);
    };
    compute();
    if (theme === "system") {
      mq.addEventListener("change", compute);
      return () => mq.removeEventListener("change", compute);
    }
  }, [theme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    if (typeof localStorage !== "undefined") localStorage.setItem("thawani-theme", t);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
