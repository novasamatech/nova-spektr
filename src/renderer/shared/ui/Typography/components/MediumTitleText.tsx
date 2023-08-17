import { cnTw } from '@renderer/shared/lib/utils';
import { TypographyProps } from '../common/types';
import { TextBase } from '../common/TextBase';

export const MediumTitleText = ({ className, as = 'h1', ...props }: TypographyProps) => (
  <TextBase className={cnTw('text-medium-title font-manrope', className)} as={as} {...props} />
);
