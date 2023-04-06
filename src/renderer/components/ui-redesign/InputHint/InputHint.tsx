import cn from 'classnames';

import CalloutText from '@renderer/components/ui-redesign/Typography/components/CalloutText';
import { TypographyProps } from '@renderer/components/ui-redesign/Typography/common/types';
import { HintVariant, variantStyles } from '@renderer/components/ui-redesign/InputHint/contants';

type Props = {
  active: boolean;
  variant: HintVariant;
};

const InputHint = ({ variant, active, className, children, ...props }: Props & TypographyProps) => {
  if (!active) return null;

  return (
    <CalloutText className={cn(variantStyles[variant], className)} {...props}>
      {children}
    </CalloutText>
  );
};

export default InputHint;
