import { cnTw } from '@shared/lib/utils';
import { type TypographyProps } from '../common/types';
import { TextBase } from '../common/TextBase';

export const CaptionText = ({ className, ...props }: TypographyProps) => (
  <TextBase className={cnTw('text-caption', className)} {...props} />
);
