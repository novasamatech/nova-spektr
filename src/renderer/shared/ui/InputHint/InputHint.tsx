import { cnTw } from '@renderer/shared/lib/utils';
import { TypographyProps } from '@renderer/shared/ui/Typography/common/types';
import { HintVariant, HintStyles } from '@renderer/shared/ui/InputHint/contants';
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
