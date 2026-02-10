import { type Locale } from 'date-fns';
import { type FormatDistanceToken } from 'date-fns/locale';
import { enGB } from 'date-fns/locale/en-GB';

import { type LanguageItem, type SupportedLocale } from './types';

export const LOCALE_KEY = 'locale';

export const shortDateLocaleEnGB: Locale = {
  ...enGB,
  formatDistance: (token, count) => {
    const abbreviations: Record<FormatDistanceToken, string> = {
      lessThanXSeconds: `<${count}s`,
      xSeconds: `${count}s`,
      halfAMinute: `30s`,
      lessThanXMinutes: `<${count}min`,
      xMinutes: `${count}min`,
      aboutXHours: `~${count}h`,
      xHours: `${count}h`,
      xDays: `${count}d`,
      aboutXWeeks: `~${count}w`,
      xWeeks: `${count}w`,
      aboutXMonths: `~${count}mo`,
      xMonths: `${count}mo`,
      aboutXYears: `~${count}y`,
      xYears: `${count}y`,
      overXYears: `>${count}y`,
      almostXYears: `~${count}y`,
    };

    return abbreviations[token] || enGB.formatDistance(token, count);
  },
};

export const LanguageOptions: LanguageItem[] = [
  {
    value: 'en',
    label: 'English',
    shortLabel: 'EN',
    dateLocale: enGB,
    shortDateLocale: shortDateLocaleEnGB,
  },
];

export const Locales: Record<string, SupportedLocale> = {
  en: 'en',
};

export const DEFAULT_LOCALE: SupportedLocale = 'en';
