import { cnTw } from '@/shared/lib/utils';

type Props = {
  change: number | undefined;
};

export const PriceChange = ({ change }: Props) => {
  if (change === undefined || change === null) return null;

  const isPositive = change >= 0;
  const formatted = `${isPositive ? '+' : ''}${change.toFixed(2)}%`;

  return (
    <span className={cnTw('text-left text-footnote', isPositive ? 'text-text-positive' : 'text-text-negative')}>
      {isPositive ? '\u2191' : '\u2193'} {}
      {formatted}
    </span>
  );
};
