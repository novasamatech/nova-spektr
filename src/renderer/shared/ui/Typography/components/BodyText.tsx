import { cnTw } from '@renderer/shared/lib/utils';
import { FontWeight, TypographyProps } from '../common/types';
import TextBase from '../common/TextBase';

type Props = TypographyProps & { fontWeight?: FontWeight };
export const BodyText = ({ className, fontWeight, ...props }: Props) => (
  <TextBase className={cnTw('text-body', fontWeight && `font-${fontWeight}`, className)} {...props} />
);
