import { Variant } from './types';

export const VariantAnimationProps: Record<Variant, Object> = {
  success: {},
  error: {},
  warning: {},
  loading: { loop: true },
};
