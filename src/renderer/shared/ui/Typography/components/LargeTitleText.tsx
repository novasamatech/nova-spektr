import { cnTw } from '@shared/lib/utils';

import { TextBase } from '../common/TextBase';
import { type TypographyProps } from '../common/types';

export const LargeTitleText = ({ className, as = 'h1', ...props }: TypographyProps) => (
  <TextBase className={cnTw('text-large-title font-manrope', className)} as={as} {...props} />
);
