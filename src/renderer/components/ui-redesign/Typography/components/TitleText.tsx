import cn from 'classnames';

import { TypographyProps } from '@renderer/components/ui-redesign/Typography/common/types';
import Text from '@renderer/components/ui-redesign/Typography/common/Text';

const TitleText = ({ className, ...props }: TypographyProps) => (
  <Text className={cn('text-title1', className)} {...props} />
);

export default TitleText;
