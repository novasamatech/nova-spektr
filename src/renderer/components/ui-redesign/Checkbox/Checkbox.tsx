import { ChangeEvent, PropsWithChildren } from 'react';

import { LabelText } from '@renderer/components/ui-redesign';
import cnTw from '@renderer/shared/utils/twMerge';
import './styles.css';

type Props = {
  defaultChecked?: boolean;
  position?: 'right' | 'left';
  checked?: boolean;
  semiChecked?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  value?: any;
  className?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>, semiChecked?: boolean) => void;
  tabIndex?: number;
};

const Checkbox = ({
  checked,
  semiChecked,
  defaultChecked,
  position = 'right',
  disabled,
  readOnly,
  value,
  className = 'text-text-primary',
  children,
  onChange,
  tabIndex,
}: PropsWithChildren<Props>) => (
  <LabelText className={cnTw('flex items-center gap-x-2', !disabled && 'hover:cursor-pointer', className)}>
    {Boolean(children) && position === 'left' && children}
    <input
      type="checkbox"
      name="checkbox"
      defaultChecked={defaultChecked}
      disabled={disabled}
      readOnly={readOnly}
      checked={checked}
      value={value}
      className={cnTw(
        'checkbox relative shrink-0 appearance-none w-4 h-4 text-button-text outline-offset-1',
        'rounded border border-filter-border bg-button-text',
        'checked:bg-icon-accent checked:border-0 checked:focus:border checked:border-icon-accent-default',
        semiChecked && 'semi-checked bg-icon-accent border-0 focus:border border-icon-accent-default',
        'hover:shadow-card-shadow hover:checked:bg-icon-accent-default',
        'disabled:text-filter-border disabled:bg-main-app-background disabled:checked:bg-main-app-background',
        !disabled && 'hover:cursor-pointer',
      )}
      tabIndex={tabIndex}
      onChange={onChange}
    />
    {Boolean(children) && position === 'right' && children}
  </LabelText>
);

export default Checkbox;
