import AllIcons, { type IconNames } from './data';
import { cnTw } from '@shared/lib/utils';

type Props = {
  as?: 'img' | 'svg';
  name: IconNames;
  size?: number;
  className?: string;
  alt?: string;
};

export const Icon = ({ as = 'svg', name, size = 24, className, alt = '' }: Props) => {
  if (!name) return null;

  let iconType = as;
  let IconComponent = AllIcons[name][as];

  if (!IconComponent) {
    console.warn(`Icon "${name}" doesn't have "${as}" type`);

    iconType = as === 'svg' ? 'img' : 'svg';
    IconComponent = AllIcons[name][iconType];

    if (!IconComponent) {
      console.warn(`Icon "${name}" doesn't exist`);

      return <div style={{ width: size, height: size, borderRadius: 10, backgroundColor: 'lightgrey' }} />;
    }
  }

  if (iconType === 'svg') {
    return (
      <IconComponent
        className={cnTw('text-icon-default', className)}
        width={size}
        height={size}
        role="img"
        data-testid={`${name}-svg`}
      />
    );
  }

  if (iconType === 'img') {
    return (
      <img
        className={className}
        src={IconComponent as string}
        alt={alt}
        width={size}
        height={size}
        data-testid={`${name}-img`}
      />
    );
  }

  return null;
};
