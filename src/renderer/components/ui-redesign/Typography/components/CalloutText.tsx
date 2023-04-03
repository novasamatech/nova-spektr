import cn from 'classnames';

import { TypographyProps } from '@renderer/components/ui-redesign/Typography/common/types';
import TextBase from '@renderer/components/ui-redesign/Typography/common/TextBase';

const CalloutText = ({ className, ...props }: TypographyProps) => (
  <TextBase className={cn('text-callout', className)} {...props} />
);

export default CalloutText;
