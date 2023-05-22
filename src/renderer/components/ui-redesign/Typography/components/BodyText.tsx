import cnTw from '@renderer/shared/utils/twMerge';
import { TypographyProps } from '@renderer/components/ui-redesign/Typography/common/types';
import TextBase from '@renderer/components/ui-redesign/Typography/common/TextBase';

export const BodyText = ({ className, fontWeight = 'medium', ...props }: TypographyProps) => (
  <TextBase className={cnTw('text-body font-inter', className)} fontWeight={fontWeight} {...props} />
);
