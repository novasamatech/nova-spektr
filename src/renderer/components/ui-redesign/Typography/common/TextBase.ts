import { createElement } from 'react';

import cnTw from '@renderer/shared/utils/twMerge';
import { TypographyProps } from '@renderer/components/ui-redesign/Typography/common/types';

const TextBase = ({ as = 'p', align = 'left', className, children }: TypographyProps) => {
  return createElement(as, { className: cnTw(`text-${align} text-text-primary`, className) }, children);
};

export type TextBaseType = typeof TextBase;

export default TextBase;
