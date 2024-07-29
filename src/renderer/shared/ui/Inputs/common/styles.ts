import { type Theme } from '../../Dropdowns/common/types';

export const CommonInputStyles = 'py-[7px] px-3 text-footnote border rounded outline-offset-1';

export const CommonInputStylesTheme: Record<Theme, string> = {
  light: 'bg-input-background text-text-primary',
  dark: 'text-white',
};
