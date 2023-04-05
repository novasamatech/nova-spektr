import cn from 'classnames';

import TextBase from '@renderer/components/ui-redesign/Typography/common/TextBase';
import { TypographyProps } from '@renderer/components/ui-redesign/Typography/common/types';

const TitleText = ({ className, as = 'h2', ...props }: TypographyProps) => (
  <TextBase className={cn('text-title', className)} as={as} {...props} />
);

export default TitleText;
