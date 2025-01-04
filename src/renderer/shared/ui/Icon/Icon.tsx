import { Suspense, lazy, memo } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { Shimmering } from '../Shimmering/Shimmering';

import { type IconNames } from './data';

type Props = {
  name: IconNames;
  size?: number;
  className?: string;
};

const LazyIcon = lazy(async () => {
  const icons = await import('./data').then((x) => x.default);

  const InternalIcon = ({ name, size = 24, className }: Props) => {
    if (!name) {
      return null;
    }

    const IconComponent = icons[name]['svg'];

    if (!IconComponent) {
      console.warn(`Icon "${name}" doesn't exist`);

      return <Shimmering circle width={size} height={size} />;
    }

    return (
      <IconComponent
        className={cnTw('pointer-events-none select-none text-icon-default', className)}
        width={size}
        height={size}
        role="img"
        data-testid={`Icon:${name}`}
      />
    );
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
