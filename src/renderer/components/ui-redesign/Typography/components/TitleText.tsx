import cnTw from '@renderer/shared/utils/twMerge';
import TextBase from '@renderer/components/ui-redesign/Typography/common/TextBase';
import { TypographyProps } from '@renderer/components/ui-redesign/Typography/common/types';

export const TitleText = ({ className, as = 'h2', fontWeight = 'extrabold', ...props }: TypographyProps) => (
  <TextBase className={cnTw('text-title font-manrope', className)} as={as} fontWeight={fontWeight} {...props} />
);
