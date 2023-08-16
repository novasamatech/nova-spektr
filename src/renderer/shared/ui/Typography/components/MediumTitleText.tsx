import { cnTw } from '@renderer/shared/lib/utils';
import TextBase from '../common/TextBase';
import { TypographyProps } from '../common/types';

export const MediumTitleText = ({ className, as = 'h1', ...props }: TypographyProps) => (
  <TextBase className={cnTw('text-medium-title font-manrope', className)} as={as} {...props} />
);
