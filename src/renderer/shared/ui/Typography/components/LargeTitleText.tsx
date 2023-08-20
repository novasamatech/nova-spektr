import { cnTw } from '@renderer/shared/lib/utils';
import { TextBase } from '../common/TextBase';
import { TypographyProps } from '../common/types';

export const LargeTitleText = ({ className, as = 'h2', ...props }: TypographyProps) => (
  <TextBase className={cnTw('text-large-title font-manrope', className)} as={as} {...props} />
);
