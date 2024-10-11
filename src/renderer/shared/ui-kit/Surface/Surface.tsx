import { type ComponentProps, forwardRef } from 'react';

import { cnTw } from '../../lib/utils';

type Props = ComponentProps<'div'> & {
  elevation?: 0 | 1 | 2;
};

export const Surface = forwardRef<HTMLDivElement, Props>(({ elevation, className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cnTw('relative rounded-md bg-block-background-default text-body', className, {
        'rounded-md border border-token-container-border shadow-shadow-2': elevation === 1,
        'rounded-lg border border-token-container-border shadow-shadow-1': elevation === 2,
      })}
      {...props}
    ></div>
  );
});
