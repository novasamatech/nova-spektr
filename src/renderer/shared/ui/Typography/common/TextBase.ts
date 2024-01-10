import { createElement } from 'react';

import { cnTw } from '@shared/lib/utils';
import { TypographyProps } from './types';

const TextBase = ({ as = 'p', align = 'left', className, children }: TypographyProps) => {
  return createElement(as, { className: cnTw(`text-${align} text-text-primary`, className) }, children);
};

export default TextBase;
