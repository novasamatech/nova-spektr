import { Icon } from '@renderer/shared/ui';
import { cnTw } from '@renderer/shared/lib/utils';

type Props = {
  size?: number;
  color: 'primary' | 'white';
  className?: string;
};

const Loader = ({ size = 16, color, className }: Props) => {
  const iconColor = color === 'white' ? 'text-icon-button' : 'text-icon-accent';

  return <Icon className={cnTw('animate-spin', className, iconColor)} name="loader" size={size} />;
};

export default Loader;
