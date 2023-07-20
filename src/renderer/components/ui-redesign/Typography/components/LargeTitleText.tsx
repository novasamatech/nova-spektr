import cnTw from '@renderer/shared/utils/twMerge';
import TextBase from '../common/TextBase';
import { TypographyProps } from '../common/types';

export const LargeTitleText = ({ className, as = 'h1', ...props }: TypographyProps) => (
  <TextBase className={cnTw('text-large-title font-manrope', className)} as={as} {...props} />
);
