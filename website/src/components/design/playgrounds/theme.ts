'use client';

import { useEffect, useSyncExternalStore } from 'react';

/**
 * Playground 可选的配色主题（不含明暗，明暗跟随文档站全局设置）。
 * 与 `packages/design/src/themes/*.css` 中实际存在的主题保持一致。
 */
export const PLAYGROUND_THEMES = {
  neutral: {
    label: 'Neutral',
    className: 'theme-neutral',
  },
  anthropic: {
    label: 'Anthropic',
    className: 'theme-anthropic',
  },
} as const;

export type PlaygroundThemeName = keyof typeof PLAYGROUND_THEMES;

const STORAGE_KEY = 'momo-playground-theme';
const DEFAULT_THEME: PlaygroundThemeName = 'neutral';
const THEME_CLASS_NAMES = Object.values(PLAYGROUND_THEMES).map(
  (theme) => theme.className,
);

function isPlaygroundTheme(value: string | null): value is PlaygroundThemeName {
  return value != null && value in PLAYGROUND_THEMES;
}

function readStoredTheme(): PlaygroundThemeName {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return isPlaygroundTheme(stored) ? stored : DEFAULT_THEME;
}

function applyRootTheme(theme: PlaygroundThemeName) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.classList.remove(...THEME_CLASS_NAMES);
  root.classList.add(PLAYGROUND_THEMES[theme].className);
  root.dataset.momoTheme = theme;
}

/**
 * 模块级单例状态：所有 Playground 实例共享同一份主题选择，
 * 而非各自维护独立的 useState（满足“全局状态”要求）。
 */
let currentTheme: PlaygroundThemeName = DEFAULT_THEME;
let initialized = false;
const listeners = new Set<() => void>();

function ensureInitialized() {
  if (initialized) return;
  initialized = true;
  currentTheme = readStoredTheme();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  ensureInitialized();
  return currentTheme;
}

function getServerSnapshot() {
  return DEFAULT_THEME;
}

export function setPlaygroundTheme(theme: PlaygroundThemeName) {
  ensureInitialized();
  if (theme === currentTheme) return;

  currentTheme = theme;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, theme);
    applyRootTheme(theme);
  }
  for (const listener of listeners) listener();
}

export function usePlaygroundTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    applyRootTheme(theme);
  }, [theme]);

  return [theme, setPlaygroundTheme] as const;
}
