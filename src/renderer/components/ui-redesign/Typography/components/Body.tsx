import cn from 'classnames';

import { TypographyProps } from '@renderer/components/ui-redesign/Typography/common/types';
import Text from '@renderer/components/ui-redesign/Typography/common/Text';

const Body = ({ className, ...props }: TypographyProps) => <Text className={cn('text-body', className)} {...props} />;

export default Body;
