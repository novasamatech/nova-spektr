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
        className={cnTw('relative rounded-md bg-block-background-default text-body', className, {
          'rounded-md border border-token-container-border shadow-shadow-2': elevation === 1,
          'rounded-lg border border-token-container-border shadow-shadow-1': elevation === 2,
        })}
        {...props}
      ></Component>
    );
  },
);
