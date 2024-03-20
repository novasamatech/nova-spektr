import { cnTw } from '@shared/lib/utils';
import { TypographyProps } from '../common/types';
import { TextBase } from '../common/TextBase';

export const SmallTitleText = ({ className, as = 'h4', ...props }: TypographyProps) => (
  <TextBase className={cnTw('text-small-title font-manrope', className)} {...props} />
);
