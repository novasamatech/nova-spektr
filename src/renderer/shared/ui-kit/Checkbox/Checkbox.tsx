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
    <LabelText
      className={cnTw(
        'flex gap-x-2',
        'text-inherit hover:cursor-pointer',
        checkedState === false && 'text-text-secondary',
        disabled && 'text-text-tertiary hover:cursor-default',
      )}
    >
      <CheckboxItem.Root
        checked={checkedState}
        className={cnTw(
          'group relative flex h-4 w-4 shrink-0',
          'checkbox items-center justify-center rounded-sm border border-filter-border bg-button-text',
          (checked || semiChecked) && 'border-0 border-icon-accent-default bg-primary-button-background-default',
          'hover:shadow-card-shadow aria-checked:hover:bg-primary-button-background-active',
          'disabled:border disabled:border-filter-border disabled:bg-main-app-background disabled:aria-checked:bg-main-app-background',
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
        {!checked && !semiChecked && !disabled && (
          <span
            className={cnTw('absolute opacity-0 transition-opacity', 'group-hover:opacity-100', 'pointer-events-none')}
          >
            <Icon name="checked" size={16} className="text-filter-border" />
          </span>
        )}
      </CheckboxItem.Root>
      {children}
    </LabelText>
  );
};
