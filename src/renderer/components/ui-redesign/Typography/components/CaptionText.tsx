import cn from 'classnames';

import { TypographyProps } from '@renderer/components/ui-redesign/Typography/common/types';
import TextBase from '@renderer/components/ui-redesign/Typography/common/TextBase';

export const CaptionText = ({ className, ...props }: TypographyProps) => (
  <TextBase className={cn('text-caption', className)} {...props} />
);
