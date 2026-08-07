import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type DisplaySettings = {
  largeText: boolean;
  highContrast: boolean;
  toggleLargeText: () => void;
  toggleHighContrast: () => void;
};

const KEY = "f1-family-display";

const DisplayContext = createContext<DisplaySettings>({
  largeText: false,
  highContrast: false,
  toggleLargeText: () => {},
  toggleHighContrast: () => {},
});

export function DisplaySettingsProvider({ children }: { children: ReactNode }) {
  // Read storage after mount only — reading during render would break hydration.
  const [largeText, setLargeText] = useState(false);
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { largeText?: boolean; highContrast?: boolean };
      setLargeText(Boolean(parsed.largeText));
      setHighContrast(Boolean(parsed.highContrast));
    } catch {
      /* first visit, nothing saved */
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("a11y-large-text", largeText);
    root.classList.toggle("a11y-high-contrast", highContrast);
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ largeText, highContrast }));
    } catch {
      /* storage blocked, settings just won't persist */
    }
  }, [largeText, highContrast]);

  const toggleLargeText = useCallback(() => setLargeText((value) => !value), []);
  const toggleHighContrast = useCallback(() => setHighContrast((value) => !value), []);

  return (
    <DisplayContext.Provider
      value={{ largeText, highContrast, toggleLargeText, toggleHighContrast }}
    >
      {children}
    </DisplayContext.Provider>
  );
}

export function useDisplaySettings() {
  return useContext(DisplayContext);
}
