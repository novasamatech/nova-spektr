import cn from 'classnames';

import TextBase from '@renderer/components/ui-redesign/Typography/common/TextBase';
import { TypographyProps } from '@renderer/components/ui-redesign/Typography/common/types';

export const LargeTitleText = ({ className, as = 'h1', fontWeight = 'bold', ...props }: TypographyProps) => (
  <TextBase className={cn('text-large-title font-manrope', className)} fontWeight={fontWeight} as={as} {...props} />
);
