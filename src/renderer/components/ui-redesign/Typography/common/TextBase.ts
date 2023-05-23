import { createElement } from 'react';
import cn from 'classnames';

import { TypographyProps } from '@renderer/components/ui-redesign/Typography/common/types';

const TextBase = ({ as = 'p', fontWeight = 'normal', align = 'left', className, children }: TypographyProps) => {
  return createElement(
    as,
    { className: cn(`text-${align} font-${fontWeight} text-text-primary`, className) },
    children,
  );
};

export type TextBaseType = typeof TextBase;

export default TextBase;
