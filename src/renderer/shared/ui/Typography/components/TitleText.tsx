import { cnTw } from '@/shared/lib/utils';
import { TextBase } from '../common/TextBase';
import { type TypographyProps } from '../common/types';

export const TitleText = ({ className, as = 'h2', ...props }: TypographyProps) => (
  <TextBase className={cnTw('font-manrope text-title', className)} as={as} {...props} />
);
