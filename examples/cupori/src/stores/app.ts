import { create } from 'zustand';

import { storage } from './storage';

export type AppThemeMode = 'light' | 'dark' | 'system';

export type AppThemeColor = 'neutral' | 'anthropic';

type AppThemeSurface = HTMLElement & {
  startViewTransition?: Document['startViewTransition'];
};

// export type AppThemeColor = 'light' | 'dark' | 'system';

interface AppStore {
  themeMode: AppThemeMode;
  themeColor: AppThemeColor;
  setThemeMode: (themeMode?: AppThemeMode) => void;
  setThemeColor: (themeColor?: AppThemeColor) => void;
}

const DARK_MODE = '(prefers-color-scheme: dark)';
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

const isDark = (mode: AppThemeMode) => {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return matchMedia(DARK_MODE).matches;
};

export const applyThemeMode = (themeMode = getDefaultThemeMode()) => {
  document.documentElement.classList.toggle('dark', isDark(themeMode));
};

const getDefaultThemeMode = () => {
  return storage.themeMode.get() ?? 'system';
};

export const useAppStore = create<AppStore>((set) => ({
  themeMode: getDefaultThemeMode(),
  themeColor: storage.themeColor.get() ?? 'anthropic',
  setThemeMode: (themeMode = getDefaultThemeMode()) => {
    const toggle = () => {
      applyThemeMode(themeMode);
      storage.themeMode.set(themeMode);
      set({ themeMode });
    };

    const surface = document.getElementById(
      'theme-surface',
    ) as AppThemeSurface | null;

    if (!surface?.startViewTransition || matchMedia(REDUCED_MOTION).matches) {
      toggle();
    } else {
      surface.startViewTransition(toggle);
    }
  },
  setThemeColor: (color = 'anthropic') => {
    // todo
  },
}));
