/* eslint-disable i18next/no-literal-string */
import LanguagesSprite from '@renderer/assets/images/icons/language.svg';

export const LanguageImages = {
  ru: {
    svg: true,
    size: { 20: `${LanguagesSprite}#ru-20` },
  },
  en: {
    svg: true,
    size: { 20: `${LanguagesSprite}#en-20` },
  },
} as const;

export type Languages = keyof typeof LanguageImages;
