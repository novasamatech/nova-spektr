import { Theme } from '../../Dropdowns/common/types';

export const CommonInputStyles =
  'py-1.5 px-3 text-footnote border rounded outline-offset-1 h-8.5 bg-primary-default border-border-primary text-text-primary';

export const CommonInputStylesTheme: Record<Theme, string> = {
  light: 'bg-input-background text-text-primary',
  dark: 'text-white',
};
