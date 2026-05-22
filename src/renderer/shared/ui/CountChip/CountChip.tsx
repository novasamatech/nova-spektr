import { cnTw } from '@/shared/lib/utils';
import { CaptionText } from '../Typography';

type Tone = 'accent' | 'negative';

const TONE_CLASS: Record<Tone, string> = {
  accent: 'bg-icon-accent/15 text-icon-accent',
  negative: 'bg-text-negative/15 text-text-negative',
};

type Props = {
  count: number;
  tone?: Tone;
};

export const CountChip = ({ count, tone = 'accent' }: Props) => (
  <div className={cnTw('flex h-5 min-w-[20px] items-center justify-center rounded-full px-2', TONE_CLASS[tone])}>
    <CaptionText className="font-medium">{count}</CaptionText>
  </div>
);
