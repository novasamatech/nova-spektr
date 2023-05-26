import { PropsWithChildren } from 'react';

import cnTw from '@renderer/shared/utils/twMerge';

type Props = {
  active: boolean;
  variant: 'hint' | 'alert' | 'error' | 'success';
  className?: string;
};

const InputHint = ({ variant, active, className, children }: PropsWithChildren<Props>) => {
  if (!active) return null;

  return (
    <p
      className={cnTw(
        'uppercase font-bold text-2xs',
        variant === 'hint' && 'text-shade-40',
        variant === 'alert' && 'text-alert',
        variant === 'error' && 'text-error',
        variant === 'success' && 'text-success',
        className,
      )}
    >
      {children}
    </p>
  );
};

export default InputHint;
