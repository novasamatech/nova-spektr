import { createElement } from 'react';

import { cnTw } from '@/shared/lib/utils';

import { type TypographyProps } from './types';

export const TextBase = ({ as = 'p', align = 'left', className, children, testId }: TypographyProps) => {
  if (!children) return null;

  return createElement(
    as,
    {
      className: cnTw(`text-${align} text-text-primary`, className),
      'data-testid': testId,
    },
    children,
  );
};
