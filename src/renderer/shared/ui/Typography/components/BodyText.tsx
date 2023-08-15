import { cnTw } from '@renderer/shared/lib/utils';
import { TypographyProps } from '../common/types';
import { TextBase } from '../common/TextBase';

export const BodyText = ({ className, ...props }: TypographyProps) => (
  <TextBase className={cnTw('text-body', className)} {...props} />
);
