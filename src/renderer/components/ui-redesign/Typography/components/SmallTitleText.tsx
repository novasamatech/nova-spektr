import cn from 'classnames';

import { TypographyProps } from '@renderer/components/ui-redesign/Typography/common/types';
import TextBase from '@renderer/components/ui-redesign/Typography/common/TextBase';

export const SmallTitleText = ({ className, as = 'h3', ...props }: TypographyProps) => (
  <TextBase className={cn('text-small-title', className)} {...props} />
);
