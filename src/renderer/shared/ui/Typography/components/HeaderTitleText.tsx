import { cnTw } from '@shared/lib/utils';
import { TypographyProps } from '../common/types';
import { TextBase } from '../common/TextBase';

export const HeaderTitleText = ({ className, as = 'h3', ...props }: TypographyProps) => (
  <TextBase className={cnTw('text-header-title font-manrope', className)} as={as} {...props} />
);
