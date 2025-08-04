import { type ComponentProps, forwardRef } from 'react';

import { type XOR } from '@/shared/core';
import { cnTw } from '@/shared/lib/utils';

type VariantProps = XOR<
  ComponentProps<'div'> & {
    as?: 'div';
  },
  ComponentProps<'button'> & {
    as?: 'button';
  }
>;

type Props = VariantProps & {
  elevation?: 0 | 1 | 2;
};

export const Surface = forwardRef<HTMLDivElement | HTMLButtonElement, Props>(
  ({ as = 'div', elevation, className, ...props }, ref) => {
    const Component = as;

    return (
      <Component
        // @ts-expect-error polymorphic ref which we don't want to fix because of heavy calculations with "true" polymorphic components
        ref={ref}
        className={cnTw(
          'bg-block-background-default text-body relative rounded-md',
          {
            'shadow-shadow-2 border-token-container-border rounded-md border': elevation === 1,
            'shadow-shadow-1 border-token-container-border rounded-lg border': elevation === 2,
          },
          className,
        )}
        {...props}
      ></Component>
    );
  },
);
