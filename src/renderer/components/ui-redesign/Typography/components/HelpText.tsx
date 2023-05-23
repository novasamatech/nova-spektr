import cnTw from '@renderer/shared/utils/twMerge';
import { TypographyProps } from '@renderer/components/ui-redesign/Typography/common/types';
import TextBase from '@renderer/components/ui-redesign/Typography/common/TextBase';

export const HelpText = ({ className, fontWeight = 'medium', ...props }: TypographyProps) => (
  <TextBase className={cnTw('text-help-text font-inter', className)} {...props} />
);
