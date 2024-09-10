import { createContext } from 'react';

export type ThemeContextTheme = {
  portalContainer: HTMLElement | null;
};

export const ThemeContext = createContext<ThemeContextTheme>({
  portalContainer: null,
});
