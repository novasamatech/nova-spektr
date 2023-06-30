import cnTw from '@renderer/shared/utils/twMerge';
import { TypographyProps } from '../common/types';
import TextBase from '../common/TextBase';

export const FootnoteText = ({ className, ...props }: TypographyProps) => (
  <TextBase className={cnTw('text-footnote', className)} {...props} />
);
