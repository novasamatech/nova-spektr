import { Theme } from './types';

export const CommonInputStylesTheme: Record<Theme, string> = {
  light: 'bg-primary-default text-text-primary',
  dark: 'text-white',
};

export const InputStyles = {
  base: 'py-1.5 px-3 text-footnote border rounded outline-offset-2 bg-primary-default border-border-primary text-text-primary',
  enabled:
    'focus-within:border-border-accent hover:focus-within:border-border-accent hover:border-border-secondary focus-within:caret-border-focus',
  disabled: 'bg-bg-secondary text-text-tertiary',
  invalid: 'border-border-negative',
};
