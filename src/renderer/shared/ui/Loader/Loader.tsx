import { IconSize, Icon } from '../Icon/Icon';
import { cnTw } from '@renderer/shared/lib/utils';

type Props = IconSize & {
  color: 'primary' | 'white';
  className?: string;
};

const Loader = ({ size = 16, color, className }: Props) => {
  const iconColor = color === 'white' ? 'text-icon-button' : 'text-icon-accent';

  // TODO: replace with loader icon
  // return <Icon className={cnTw('animate-spin', className, iconColor)} name="loader" size={size} />;
  return <Icon className={cnTw('animate-spin', className, iconColor)} name="refresh" size={size} />;
};

export default Loader;
