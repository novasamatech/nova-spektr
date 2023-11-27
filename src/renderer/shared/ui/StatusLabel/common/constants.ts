import { Variant } from './types';

export const DotStyles: Record<Variant, string> = {
  waiting: 'bg-icon-default',
  success: 'bg-icon-positive',
  warn: 'bg-icon-warning',
  error: 'bg-icon-negative',
  staking: 'bg-icon-accent',
};

export const TitleStyles: Record<Variant, string> = {
  waiting: 'text-text-tertiary',
  success: 'text-text-positive',
  warn: 'text-text-warning',
  error: 'text-text-negative',
  staking: 'text-tab-text-accent',
};
