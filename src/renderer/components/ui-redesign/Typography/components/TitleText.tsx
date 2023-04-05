import cn from 'classnames';

import { TypographyProps } from '@renderer/components/ui-redesign/Typography/common/types';
import Text from '@renderer/components/ui-redesign/Typography/common/Text';

const TitleText = ({ className, as = 'h2', ...props }: TypographyProps) => (
  <Text className={cn('text-title', className)} as={as} {...props} />
);

export default TitleText;
