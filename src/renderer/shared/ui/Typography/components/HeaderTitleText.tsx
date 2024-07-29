import { cnTw } from '@shared/lib/utils';
import { TextBase } from '../common/TextBase';
import { type TypographyProps } from '../common/types';

export const HeaderTitleText = ({ className, as = 'h3', ...props }: TypographyProps) => (
  <TextBase className={cnTw('text-header-title font-manrope', className)} as={as} {...props} />
);
