import { IconNames } from '@renderer/components/ui/Icon/data';
import { Variant } from './types';

export const VariantIcons: Record<Variant, IconNames> = {
  success: 'checkLineRedesign',
  error: 'closeLineRedesign',
  loading: 'loaderRedesign',
};

export const VariantStyles: Record<Variant, string> = {
  success: 'text-text-positive',
  error: 'text-text-negative',
  loading: 'animate-spin',
};
