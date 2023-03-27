import cn from 'classnames';
import { ReactNode, ComponentPropsWithoutRef, forwardRef } from 'react';

import { HTMLTextAreaProps } from '../common/types';

interface Props extends Pick<ComponentPropsWithoutRef<'textarea'>, HTMLTextAreaProps> {
  label?: ReactNode;
  disabledStyle?: boolean;
  invalid?: boolean;
  wrapperClass?: string;
  onChange?: (value: string) => void;
}

const InputArea = forwardRef<HTMLTextAreaElement, Props>(
  ({ label = '', disabledStyle, className, wrapperClass, invalid = false, onChange, ...props }, ref) => (
    <label
      className={cn(
        'relative flex items-center rounded-2lg p-2 box-border border-2',
        'text-sm font-normal leading-5 focus-within:border-primary',
        invalid ? 'border-error' : 'border-shade-2',
        label && 'rounded-2lg text-lg px-2.5 pb-0 pt-5',
        disabledStyle ? 'bg-white' : 'bg-shade-2',
        wrapperClass,
      )}
    >
      {label && (
        <div className="absolute top-2.5 font-bold text-neutral-variant uppercase text-2xs w-full pr-5">{label}</div>
      )}
      <textarea
        className={cn(
          'resize-none rounded-sm leading-5 bg-transparent flex-1 placeholder-shade-30',
          'focus:outline-none focus:text-primary',
          disabledStyle ? 'text-shade-40' : props.value && !invalid && 'text-neutral',
          invalid && 'text-error',
          label && 'py-1 my-4',
          className,
        )}
        ref={ref}
        onChange={(event) => onChange?.(event.target.value)}
        {...props}
      />
    </label>
  ),
);

export default InputArea;
