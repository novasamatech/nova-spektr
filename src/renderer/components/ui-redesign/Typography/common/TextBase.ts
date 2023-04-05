import { createElement } from 'react';
import cn from 'classnames';

import { TypographyProps } from '@renderer/components/ui-redesign/Typography/common/types';

const TextBase = ({ as = 'p', fontWeight = 'regular', align = 'left', className, children }: TypographyProps) => {
  return createElement(as, { className: cn(`text-${align} font-${fontWeight}`, className) }, children);
};

export default TextBase;
