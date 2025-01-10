import { createContext } from 'react';

export type ThemeContextTheme = {
  portalContainer: HTMLElement | null;
  iconStyle: 'monochrome' | 'colored';
  theme: 'light' | 'dark';
};

export const ThemeContext = createContext<ThemeContextTheme>({
  portalContainer: null,
  iconStyle: 'colored',
  theme: 'light',
});
