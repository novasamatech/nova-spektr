import cnTw from '@renderer/shared/utils/twMerge';
import { TypographyProps } from '@renderer/components/ui-redesign/Typography/common/types';
import TextBase from '@renderer/components/ui-redesign/Typography/common/TextBase';

export const CaptionText = ({ className, fontWeight = 'semibold', ...props }: TypographyProps) => (
  <TextBase
    className={cnTw('text-caption font-inter tracking-[0.75px]', className)}
    fontWeight={fontWeight}
    {...props}
  />
);
