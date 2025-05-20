import { type MouseEventHandler, memo } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { Icon, type IconNames } from '@/shared/ui';

type Props = {
  variant: 'positive' | 'negative';
  icon: IconNames;
  checked?: boolean;
  marked?: boolean;
  disabled?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  onMouseOver?: MouseEventHandler<HTMLButtonElement>;
  onMouseLeave?: MouseEventHandler<HTMLButtonElement>;
};

export const FilledIconButton = memo(
  ({ variant, disabled, checked, marked, icon, onClick, onMouseOver, onMouseLeave }: Props) => {
    return (
      <button
        type="button"
        disabled={disabled}
        className={cnTw(
          'flex appearance-none flex-col items-center gap-2 rounded-lg px-4 py-3',
          'disabled:pointer-events-none disabled:bg-secondary-button-background',
          {
            'pointer-events-auto': !checked,
          },
          {
            'bg-alert-background-negative text-text-negative hover:bg-badge-red-background active:bg-secondary-negative-button-background-active':
              variant === 'negative',
            'bg-alert-background-positive text-text-positive hover:bg-badge-green-background active:bg-secondary-positive-button-background-active':
              variant === 'positive',
          },
          {
            'bg-label-background-red': variant === 'negative' && marked,
            'bg-label-background-green': variant === 'positive' && marked,
          },
        )}
        onClick={onClick}
        onMouseOver={onMouseOver}
        onMouseLeave={onMouseLeave}
      >
        <Icon
          name={icon}
          size={16}
          className={cnTw({
            'text-icon-negative': variant === 'negative' && !disabled,
            'text-icon-positive': variant === 'positive' && !disabled,
            'text-icon-button': marked && !disabled,
          })}
        />
      </button>
    );
  },
);
