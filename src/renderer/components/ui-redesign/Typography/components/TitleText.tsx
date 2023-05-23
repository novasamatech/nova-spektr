import cn from 'classnames';

import TextBase from '@renderer/components/ui-redesign/Typography/common/TextBase';
import { TypographyProps } from '@renderer/components/ui-redesign/Typography/common/types';

export const TitleText = ({ className, as = 'h2', fontWeight = 'bold', ...props }: TypographyProps) => (
  <TextBase className={cn('text-title font-manrope', className)} as={as} fontWeight={fontWeight} {...props} />
);
