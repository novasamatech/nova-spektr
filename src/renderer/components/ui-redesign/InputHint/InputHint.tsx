import cnTw from '@renderer/shared/utils/twMerge';
import { TypographyProps } from '@renderer/components/ui-redesign/Typography/common/types';
import { HintVariant, HintStyles } from '@renderer/components/ui-redesign/InputHint/contants';
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
