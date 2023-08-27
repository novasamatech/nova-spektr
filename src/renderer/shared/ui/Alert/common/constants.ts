import { Variant } from './types';
import { IconNames } from '@renderer/shared/ui/types';

export const IconName: Record<Variant, IconNames> = {
  info: 'info',
  warn: 'status-warning',
  error: 'status-error',
};

export const ViewStyle: Record<Variant, string> = {
  info: 'bg-bg-accent-secondary border-border-accent',
  warn: 'bg-bg-warning-secondary border-border-warning',
  error: 'bg-bg-negative-secondary border-border-negative',
};

export const IconStyle: Record<Variant, string> = {
  info: 'shrink-0 text-icon-accent-default',
  warn: 'shrink-0 text-icon-warning-default',
  error: 'shrink-0 text-icon-negative-default',
};
