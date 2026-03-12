import { cnTw } from '@/shared/lib/utils';
import { FootnoteText } from '@/shared/ui';

type Props = {
  change: number | undefined;
};

export const PriceChange = ({ change }: Props) => {
  if (change === undefined || change === null) return null;

  const isPositive = change >= 0;
  const formatted = `${isPositive ? '+' : ''}${change.toFixed(2)}%`;

  return (
    <FootnoteText
      className={cnTw(
        'rounded px-1.5 py-0.5',
        isPositive ? 'bg-[--positive-background] text-text-positive' : 'bg-[--negative-background] text-text-negative',
      )}
    >
      {isPositive ? '\u2191' : '\u2193'} {formatted}
    </FootnoteText>
  );
};
