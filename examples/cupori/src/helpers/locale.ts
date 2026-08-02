import type { Locale as DateFnsLocale } from 'date-fns';
import { enUS, zhCN } from 'date-fns/locale';

import type { Locale } from '@/paraglide/runtime.js';
import { getLocale } from '@/paraglide/runtime.js';

const DATE_FNS_LOCALES = {
  'zh-CN': zhCN,
  en: enUS,
} satisfies Record<Locale, DateFnsLocale>;

export function getDateFnsLocale() {
  return DATE_FNS_LOCALES[getLocale()];
}

export function formatDate(date: Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(getLocale(), options).format(date);
}

export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions,
) {
  return new Intl.NumberFormat(getLocale(), options).format(value);
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat(getLocale(), {
    style: 'currency',
    currency: 'CNY',
  }).format(value);
}

export function formatList(values: string[]) {
  return new Intl.ListFormat(getLocale(), {
    style: 'long',
    type: 'conjunction',
  }).format(values);
}
