import { Icon } from '@renderer/components/ui';
import cnTw from '@renderer/shared/utils/twMerge';

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
