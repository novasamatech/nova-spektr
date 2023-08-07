import { IconNames } from '@renderer/shared/ui/Icon/data';
import { Variant } from './types';
import { AnimationNames, Props } from '@renderer/shared/ui/Animation/Animation';

export const VariantIcons: Record<Variant, IconNames> = {
  success: 'checkLineRedesign',
  error: 'closeLineRedesign',
  loading: 'loader',
};

export const VariantAnimations: Record<Variant, AnimationNames> = {
  success: 'success',
  error: 'error',
  loading: 'loading',
};

export const VariantAnimationProps: Record<Variant, Partial<Props>> = {
  success: {},
  error: {},
  loading: { loop: true },
};

export const VariantStyles: Record<Variant, string> = {
  success: 'text-text-positive',
  error: 'text-text-negative',
  loading: 'animate-spin',
};
