import cn from 'classnames';

import { TypographyProps } from '@renderer/components/ui-redesign/Typography/common/types';
import TextBase from '@renderer/components/ui-redesign/Typography/common/TextBase';

export const HeadlineText = ({ className, fontWeight = 'medium', ...props }: TypographyProps) => (
  <TextBase className={cn('text-headline font-inter', className)} fontWeight={fontWeight} {...props} />
);
