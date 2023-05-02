export type HintVariant = 'hint' | 'alert' | 'error' | 'success';
export const variantStyles: { [K in HintVariant]: string } = {
  hint: 'text-text-tertiary',
  alert: 'text-alert', // TODO add new styles for all variants
  error: 'text-text-negative',
  success: 'text-text-positive',
};
