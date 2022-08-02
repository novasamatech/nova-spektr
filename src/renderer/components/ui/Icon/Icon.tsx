import AllIcons, { IconNames } from './data';

type Props = {
  as?: 'img' | 'svg';
  name: IconNames;
  size?: number;
  className?: string;
  alt?: string;
};

const Icon = ({ as = 'svg', name, size = 24, className, alt = '' }: Props) => {
  const IconComponent = AllIcons[name][as];

  if (!IconComponent) {
    throw new Error('Icons not found or unknown icon type');
  }

  if (as === 'svg') {
    return <IconComponent className={className} width={size} height={size} role="img" data-testid={`${name}-svg`} />;
  }

  if (as === 'img') {
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

export default Icon;
