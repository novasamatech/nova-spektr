import { type ChangeEvent, type PropsWithChildren } from 'react';

import { cnTw } from '@/shared/lib/utils';
import './Checkbox.css';
import { LabelText } from '@/shared/ui/Typography';

type Props = {
  position?: 'right' | 'left';
  checked?: boolean;
  semiChecked?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>, semiChecked?: boolean) => void;
  tabIndex?: number;
};

export const Checkbox = ({
  checked,
  semiChecked,
  position = 'right',
  disabled,
  readOnly,
  className,
  children,
  onChange,
  tabIndex,
}: PropsWithChildren<Props>) => (
  <LabelText
    className={cnTw(
      'flex items-center gap-x-2',
      !disabled && 'hover:cursor-pointer',
      disabled ? 'text-text-tertiary' : 'text-text-primary',
      className,
    )}
  >
    {Boolean(children) && position === 'left' && children}
    <input
      type="checkbox"
      name="checkbox"
      disabled={disabled}
      readOnly={readOnly}
      checked={checked}
      className={cnTw(
        'checkbox relative h-4 w-4 shrink-0 appearance-none text-white outline-offset-1',
        'rounded border border-filter-border bg-button-text',
        'checked:border-0 checked:border-icon-accent-default checked:bg-icon-accent checked:active:border',
        !checked && semiChecked && 'semi-checked border-0 border-icon-accent-default bg-icon-accent focus:border',
        'hover:shadow-card-shadow hover:checked:bg-icon-accent-default',
        'disabled:border disabled:border-filter-border disabled:bg-main-app-background disabled:text-filter-border disabled:checked:bg-main-app-background',
        !disabled && 'hover:cursor-pointer',
      )}
      tabIndex={tabIndex}
      onChange={onChange}
    />
    {Boolean(children) && position === 'right' && children}
  </LabelText>
);
