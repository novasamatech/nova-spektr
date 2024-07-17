import { cnTw } from '@shared/lib/utils';

import { TextBase } from '../common/TextBase';
import { type TypographyProps } from '../common/types';

export const FootnoteText = ({ className, ...props }: TypographyProps) => (
  <TextBase className={cnTw('text-footnote', className)} {...props} />
);
