import cn from 'classnames';

import { TypographyProps } from '@renderer/components/ui-redesign/Typography/common/types';
import TextBase from '@renderer/components/ui-redesign/Typography/common/TextBase';

const SmallTitleText = ({ className, ...props }: TypographyProps) => (
  <TextBase className={cn('text-small-title', className)} {...props} />
);

export default SmallTitleText;
