import { createElement } from 'react';

import { cnTw } from '@/shared/lib/utils';

import { type TypographyProps } from './types';

export const TextBase = ({ as = 'p', align = 'left', className, children }: TypographyProps) => {
  if (!children) return null;

  return createElement(as, { className: cnTw(`text-${align} text-text-primary`, className) }, children);
};
