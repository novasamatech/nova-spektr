import cn from 'classnames';
import { PropsWithChildren } from 'react';

type Props = {
  type: 'hint' | 'alert' | 'error' | 'success';
  className?: string;
};

const InputHint = ({ type, className, children }: PropsWithChildren<Props>) => (
  <p
    className={cn(
      'uppercase font-bold text-2xs',
      type === 'hint' && 'text-shade-40',
      type === 'alert' && 'text-alert',
      type === 'error' && 'text-error',
      type === 'success' && 'text-success',
      className,
    )}
  >
    {children}
  </p>
);

export default InputHint;
