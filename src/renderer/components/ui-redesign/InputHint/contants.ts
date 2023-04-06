export type HintVariant = 'hint' | 'alert' | 'error' | 'success';
export const variantStyles: { [K in HintVariant]: string } = {
  hint: 'text-redesign-shade-48',
  alert: 'text-alert', // TODO add new styles for all variants
  error: 'text-error',
  success: 'text-success',
};
