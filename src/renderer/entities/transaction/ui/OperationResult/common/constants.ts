import { Variant } from './types';

export const VariantAnimationProps: Record<Variant, NonNullable<unknown>> = {
  success: {},
  error: {},
  warning: {},
  loading: { loop: true },
};
