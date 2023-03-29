import cn from 'classnames';

import { TypographyProps } from '@renderer/components/ui-redesign/Typography/common/types';
import Text from '@renderer/components/ui-redesign/Typography/common/Text';

const BodyText = ({ className, ...props }: TypographyProps) => (
  <Text className={cn('text-body', className)} {...props} />
);

export default BodyText;
