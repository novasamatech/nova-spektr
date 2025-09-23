import { cnTw } from '@/shared/lib/utils';

type Props = {
  count: number;
  className?: string;
};

export const ProxiesCount = ({ count, className }: Props) => {
  if (count === 0) {
    return null;
  }

  return <span className={cnTw('text-text-tertiary', className)}>{count}</span>;
};
