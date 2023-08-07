export type HintVariant = 'hint' | 'alert' | 'error' | 'success';

export const HintStyles: { [K in HintVariant]: string } = {
  hint: 'text-text-tertiary',
  alert: 'text-text-warning',
  error: 'text-text-negative',
  success: 'text-text-positive',
};
