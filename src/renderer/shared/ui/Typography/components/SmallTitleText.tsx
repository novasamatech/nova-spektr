import { cnTw } from '@/shared/lib/utils';
import { TextBase } from '../common/TextBase';
import { type TypographyProps } from '../common/types';

export const SmallTitleText = ({ className, as = 'h4', ...props }: TypographyProps) => (
  <TextBase as={as} className={cnTw('font-manrope text-small-title', className)} {...props} />
);
