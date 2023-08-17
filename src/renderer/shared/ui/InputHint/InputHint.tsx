import { cnTw } from '@renderer/shared/lib/utils';
import { FootnoteText } from '../Typography';
import { TypographyProps } from '../Typography/common/types';
import { HintVariant, HintStyles } from './common/contants';

type Props = {
  active: boolean;
  variant?: HintVariant;
};

export const InputHint = ({ variant = 'hint', active, className, children, ...props }: Props & TypographyProps) => {
  if (!active) return null;

  return (
    <FootnoteText className={cnTw(HintStyles[variant], className)} {...props}>
      {children}
    </FootnoteText>
  );
};
