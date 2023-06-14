import { Variant } from './types';

export const BadgeStyles: Record<Variant, string> = {
  waiting: 'bg-chip-icon',
  success: 'bg-icon-positive',
  warn: 'bg-icon-warning',
  error: 'bg-icon-negative',
};
