import { cnTw } from '@shared/lib/utils';
import { type TypographyProps } from '../Typography/common/types';
import { FootnoteText } from '../Typography';
import { HintStyles, type HintVariant } from './contants';

type Props = TypographyProps & {
  active: boolean;
  variant?: HintVariant;
};

export const InputHint = ({ variant = 'hint', active, className, children, ...props }: Props) => {
  if (!active) return null;

  return (
    <FootnoteText className={cnTw(HintStyles[variant], className)} {...props}>
      {children}
    </FootnoteText>
  );
};
