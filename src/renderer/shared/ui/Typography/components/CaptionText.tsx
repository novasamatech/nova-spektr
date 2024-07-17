import { cnTw } from '@shared/lib/utils';

import { TextBase } from '../common/TextBase';
import { type TypographyProps } from '../common/types';

export const CaptionText = ({ className, ...props }: TypographyProps) => (
  <TextBase className={cnTw('text-caption', className)} {...props} />
);
