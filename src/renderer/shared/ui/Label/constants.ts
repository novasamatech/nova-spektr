export type LabelPallet = 'default' | 'accent' | 'positive' | 'negative' | 'shade';

export const LabelStyles: Record<LabelPallet, string> = {
  default: 'bg-bg-secondary text-text-secondary',
  accent: 'bg-bg-accent-primary text-text-white',
  positive: 'bg-bg-positive-primary text-text-white',
  negative: 'bg-bg-negative-primary text-text-white',
  shade: 'bg-bg-shade text-text-white',
};
