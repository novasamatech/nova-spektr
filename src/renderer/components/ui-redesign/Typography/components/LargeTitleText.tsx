import cnTw from '@renderer/shared/utils/twMerge';
import TextBase from '@renderer/components/ui-redesign/Typography/common/TextBase';
import { TypographyProps } from '@renderer/components/ui-redesign/Typography/common/types';

export const LargeTitleText = ({ className, as = 'h1', ...props }: TypographyProps) => (
  <TextBase className={cnTw('text-large-title font-manrope', className)} as={as} {...props} />
);
