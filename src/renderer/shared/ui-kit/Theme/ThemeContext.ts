import { createContext } from 'react';

export type ThemeContextTheme = {
  portalContainer: HTMLElement | null;
  iconStyle: 'monochrome' | 'colored';
};

export const ThemeContext = createContext<ThemeContextTheme>({
  portalContainer: null,
  iconStyle: 'colored',
});
