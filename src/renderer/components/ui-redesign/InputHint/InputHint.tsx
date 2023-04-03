import cn from 'classnames';

import CalloutText from '@renderer/components/ui-redesign/Typography/components/CalloutText';
import { TypographyProps } from '@renderer/components/ui-redesign/Typography/common/types';

type Props = {
  active: boolean;
  variant: 'hint' | 'alert' | 'error' | 'success';
};

const InputHint = ({ variant, active, className, children, ...props }: Props & TypographyProps) => {
  if (!active) return null;

  return (
    <CalloutText
      className={cn(
        variant === 'hint' && 'text-redesign-shade-48',
        variant === 'alert' && 'text-alert', // TODO add new styles for all variants
        variant === 'error' && 'text-error',
        variant === 'success' && 'text-success',
        className,
      )}
      {...props}
    >
      {children}
    </CalloutText>
  );
};

export default InputHint;
