import { Storagefy } from '@momots/host';

import type { AppThemeColor, AppThemeMode } from './app';

export const storage = {
  themeMode: new Storagefy<AppThemeMode>(
    'app-theme-mode', // 主题模式
    () => localStorage,
  ),
  themeColor: new Storagefy<AppThemeColor>(
    'app-theme-color', // 主题颜色
    () => localStorage,
  ),
};
