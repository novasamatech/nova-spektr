import cnTw from '@renderer/shared/utils/twMerge';
import { TypographyProps } from '@renderer/components/ui-redesign/Typography/common/types';
import TextBase from '@renderer/components/ui-redesign/Typography/common/TextBase';

export const SmallTitleText = ({ className, as = 'h3', fontWeight = 'bold', ...props }: TypographyProps) => (
  <TextBase className={cnTw('text-small-title font-manrope', className)} fontWeight={fontWeight} {...props} />
);
