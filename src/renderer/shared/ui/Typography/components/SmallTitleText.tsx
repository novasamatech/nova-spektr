import { cnTw } from '@shared/lib/utils';
import { TextBase } from '../common/TextBase';
import { type TypographyProps } from '../common/types';

export const SmallTitleText = ({ className, as = 'h4', ...props }: TypographyProps) => (
  <TextBase className={cnTw('text-small-title font-manrope', className)} {...props} />
);
