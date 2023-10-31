import { cnTw } from '@shared/lib/utils';
import { TypographyProps } from '@shared/ui/Typography/common/types';
import { HintVariant, HintStyles } from '@shared/ui/InputHint/contants';
import { FootnoteText } from '../Typography';

type Props = {
  active: boolean;
  variant?: HintVariant;
};

const InputHint = ({ variant = 'hint', active, className, children, ...props }: Props & TypographyProps) => {
  if (!active) return null;

  return (
    <FootnoteText className={cnTw(HintStyles[variant], className)} {...props}>
      {children}
    </FootnoteText>
  );
};

export default InputHint;
