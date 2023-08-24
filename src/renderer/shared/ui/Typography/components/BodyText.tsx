import { cnTw } from '@renderer/shared/lib/utils';
import { TextBase } from '../common/TextBase';
import { FontWeight, TypographyProps } from '../common/types';

type Props = TypographyProps & { fontWeight?: FontWeight };
export const BodyText = ({ className, fontWeight, ...props }: Props) => (
  <TextBase
    className={cnTw(
      'text-body',
      fontWeight && `font-${fontWeight}`,
      fontWeight === 'semibold' && 'leading-4',
      className,
    )}
    {...props}
  />
);
