import { createContext } from 'react';

export type ThemeContextTheme = {
  theme: 'light' | 'dark';
  /**
   * Container for all dialog and modal components. Default values is body.
   */
  portalContainer: HTMLElement | null;
  /**
   * Preferred icon variant. This option serves as a recommendation rather than
   * a strict rule. Each 'icon' component should determine which style to use
   * based on its given context.
   */
  iconStyle: 'monochrome' | 'colored';
  /**
   * If true, every nested component should disable its own mouse and keyboard
   * event handlers. Useful for preventing 'button inside button' cases.
   */
  preferStaticContent: boolean;
};

export const ThemeContext = createContext<ThemeContextTheme>({
  preferStaticContent: false,
  portalContainer: null,
  iconStyle: 'colored',
  theme: 'light',
});
