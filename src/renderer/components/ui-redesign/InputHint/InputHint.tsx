import cn from 'classnames';

import { TypographyProps } from '@renderer/components/ui-redesign/Typography/common/types';
import { HintVariant, variantStyles } from '@renderer/components/ui-redesign/InputHint/contants';
import { FootnoteText } from '../Typography';

type Props = {
  active: boolean;
  variant: HintVariant;
};

const InputHint = ({ variant, active, className, children, ...props }: Props & TypographyProps) => {
  if (!active) return null;

  return (
    <FootnoteText className={cn(variantStyles[variant], className)} {...props}>
      {children}
    </FootnoteText>
  );
};

export default InputHint;
