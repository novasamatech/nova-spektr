import { cnTw } from '@shared/lib/utils';
import { TextBase } from '../common/TextBase';
import { TypographyProps } from '../common/types';

export const TitleText = ({ className, as = 'h2', ...props }: TypographyProps) => (
  <TextBase className={cnTw('text-title font-manrope', className)} as={as} {...props} />
);
