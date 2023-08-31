export type LabelPallet = 'default' | 'accent' | 'positive' | 'negative' | 'shade';

export const LabelStyle: Record<LabelPallet, string> = {
  default: 'bg-bg-secondary text-text-secondary',
  accent: 'bg-bg-accent-primary text-text-white',
  positive: 'bg-bg-positive-primary text-text-white',
  negative: 'bg-bg-negative-primary text-text-white',
  shade: 'bg-bg-shade text-text-white',
};

export const LabelTextStyle: Record<LabelPallet, string> = {
  default: 'text-text-secondary',
  accent: 'text-text-white',
  positive: 'text-text-white',
  negative: 'text-text-white',
  shade: 'text-text-white',
};
