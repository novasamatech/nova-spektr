import { Variant } from './types';
import { IconNames } from '@renderer/shared/ui/Icon/data';

export const IconName: Record<Variant, IconNames> = {
  info: 'info',
  warn: 'warn',
  error: 'warn',
  success: 'checkmarkOutline',
};

export const ViewStyle: Record<Variant, string> = {
  info: 'bg-alert-background border-alert-border',
  warn: 'bg-alert-background-warning border-alert-border-warning',
  error: 'bg-alert-background-negative border-alert-border-negative',
  success: 'bg-[rgba(1,_166,_62,_0.08)] border-icon-positive',
};

export const IconStyle: Record<Variant, string> = {
  info: 'shrink-0 text-icon-alert',
  warn: 'shrink-0 text-icon-warning',
  error: 'shrink-0 text-icon-negative',
  success: 'shrink-0 text-text-positive',
};
