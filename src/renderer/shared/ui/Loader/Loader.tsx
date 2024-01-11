import { Icon } from '@shared/ui';
import { cnTw } from '@shared/lib/utils';

type Props = {
  size?: number;
  color: 'primary' | 'white';
  className?: string;
};

export const Loader = ({ size = 16, color, className }: Props) => {
  const iconColor = color === 'white' ? 'text-icon-button' : 'text-icon-accent';

  return <Icon className={cnTw('animate-spin', className, iconColor)} name="loader" size={size} />;
};
