import { createElement } from 'react';

import { cnTw } from '@/shared/lib/utils';

import { type TypographyProps } from './types';

export const TextBase = ({ as = 'p', align = 'left', className, children, testId }: TypographyProps) => {
  // Only genuinely absent content is skipped. A plain `!children` would also
  // swallow the number `0`, so a counter that legitimately reads zero would
  // render nothing at all instead of "0". `NaN` stays skipped: it is the one
  // falsy number that carries no information, and rendering the literal "NaN"
  // into a balance or percentage is worse than rendering nothing.
  const isNaNChild = typeof children === 'number' && Number.isNaN(children);
  if (children === null || children === undefined || children === '' || children === false || isNaNChild) {
    return null;
  }

  return createElement(
    as,
    {
      className: cnTw(`text-${align} text-text-primary`, className),
      'data-testid': testId,
    },
    children,
  );
};
