export type OperationVariant = 'success' | 'error' | 'loading';

export const variantIcons = {
  success: 'checkLineRedesign',
  error: 'closeLineRedesign',
  loading: 'loaderRedesign',
} as const;

export const variantStyles = {
  success: 'text-text-positive',
  error: 'text-text-negative',
  loading: 'animate-spin',
} as const;
