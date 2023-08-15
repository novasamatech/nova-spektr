import { createElement } from 'react';

import { cnTw } from '@renderer/shared/lib/utils';
import { TypographyProps } from './types';

export const TextBase = ({ as = 'p', align = 'left', className, children }: TypographyProps) => {
  return createElement(as, { className: cnTw(`text-${align} text-text-primary`, className) }, children);
};
