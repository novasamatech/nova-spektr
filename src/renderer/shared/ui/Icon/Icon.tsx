import { Suspense, lazy, memo } from 'react';

import { cnTw } from '@shared/lib/utils';
import { Shimmering } from '../Shimmering/Shimmering';

import { type IconNames } from './data';

type Props = {
  as?: 'img' | 'svg';
  name: IconNames;
  size?: number;
  className?: string;
  alt?: string;
};

const LazyIcon = lazy(async () => {
  const icons = await import('./data').then((x) => x.default);

  const InternalIcon = ({ as = 'svg', name, size = 24, className, alt = '' }: Props) => {
    if (!name) {
      return null;
    }

    let iconType = as;
    let IconComponent = icons[name][as];

    if (!IconComponent) {
      console.warn(`Icon "${name}" doesn't have "${as}" type`);

      iconType = as === 'svg' ? 'img' : 'svg';
      IconComponent = icons[name][iconType];

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
          className={cnTw(className, 'pointer-events-none select-none')}
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

  return { default: InternalIcon };
});

export const Icon = memo<Props>(({ name, size = 24, ...props }) => {
  if (!name) {
    return null;
  }

  return (
    <Suspense fallback={<Shimmering circle width={size} height={size} />}>
      <LazyIcon name={name} size={size} {...props} />
    </Suspense>
  );
});
