import * as CheckboxItem from '@radix-ui/react-checkbox';
import { type MouseEvent, type PropsWithChildren } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { Icon } from '@/shared/ui/Icon/Icon';
import { LabelText } from '@/shared/ui/Typography';
import './Checkbox.css';

type Props = {
  checked?: boolean;
  semiChecked?: boolean;
  disabled?: boolean;
  checkboxPosition?: 'center' | 'top';
  onChange?: (checked: boolean, semiChecked?: boolean) => void;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
};

export const Checkbox = ({
  checked,
  semiChecked,
  disabled,
  checkboxPosition = 'center',
  children,
  onChange,
  onClick,
}: PropsWithChildren<Props>) => {
  const checkedState = checked ? true : semiChecked ? 'indeterminate' : false;
  const iconColor = disabled ? 'text-filter-border' : 'text-white';

  const handleChange = (checked: boolean | 'indeterminate') => {
    if (!onChange) return;
    const semiChecked = checked === 'indeterminate';

    onChange(!semiChecked && checked, semiChecked);
  };

  return (
    <LabelText className={cnTw('flex gap-x-2', disabled ? 'text-text-tertiary' : 'text-inherit hover:cursor-pointer')}>
      <CheckboxItem.Root
        checked={checkedState}
        className={cnTw(
          'relative flex h-4 w-4 shrink-0',
          'checkbox items-center justify-center rounded border border-filter-border bg-button-text',
          (checked || semiChecked) && 'border-0 border-icon-accent-default bg-icon-accent',
          'hover:shadow-card-shadow hover:checked:bg-icon-accent-default',
          'disabled:border disabled:border-filter-border disabled:bg-main-app-background disabled:checked:bg-main-app-background',
          !disabled && 'hover:cursor-pointer',
          checkboxPosition === 'center' && 'self-center',
          checkboxPosition === 'top' && 'self-top mt-1',
        )}
        disabled={disabled}
        onCheckedChange={handleChange}
        onClick={onClick}
      >
        <CheckboxItem.Indicator>
          {checked && <Icon name="checked" size={16} className={iconColor} />}
          {!checked && semiChecked && <Icon name="semiChecked" size={16} className={iconColor} />}
        </CheckboxItem.Indicator>
      </CheckboxItem.Root>
      {children}
    </LabelText>
  );
};
