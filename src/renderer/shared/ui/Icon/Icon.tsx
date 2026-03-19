import { type Ref, Suspense, forwardRef, lazy, memo } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { Skeleton } from '@/shared/ui-kit';

import { type IconNames } from './data';

type Props = {
  name: IconNames;
  size?: number;
  className?: string;
  testId?: string;
};

const LazyIcon = lazy(async () => {
  const icons = await import('./data').then((x) => x.default);

  const InternalIcon = ({ name, size = 24, className, innerRef, testId }: Props & { innerRef: Ref<SVGSVGElement> }) => {
    if (!name) {
      return null;
    }

    const IconComponent = icons[name]['svg'];

    if (!IconComponent) {
      console.warn(`Icon "${name}" doesn't exist`);

      return <Skeleton circle width={`${size}px`} height={`${size}px`} testId={testId} />;
    }

    return (
      <IconComponent
        aria-label={name}
        aria-roledescription="icon"
        ref={innerRef}
        className={cnTw('shrink-0 text-icon-default select-none', className)}
        width={size}
        height={size}
        role="img"
        data-testid={`Icon:${name}`}
      />
    );
  };

  return { default: InternalIcon };
});

export const Icon = memo(
  forwardRef<SVGSVGElement, Props>(({ name, size = 24, className, testId = 'Icon' }, ref) => {
    if (!name) {
      return null;
    }

    return (
      <Suspense fallback={<Skeleton circle width={`${size}px`} height={`${size}px`} testId={`${testId}:${name}`} />}>
        <LazyIcon name={name} size={size} innerRef={ref} className={className} testId={`${testId}:${name}`} />
      </Suspense>
    );
  }),
);
