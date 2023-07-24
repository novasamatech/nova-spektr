import { cnTw } from '@renderer/shared/lib/utils';
import { TypographyProps } from '../common/types';
import TextBase from '../common/TextBase';

export const FootnoteText = ({ className, ...props }: TypographyProps) => (
  <TextBase className={cnTw('text-footnote', className)} {...props} />
);
