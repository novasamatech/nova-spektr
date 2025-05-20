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
            'bg-secondary-positive-button-background text-text-positive hover:bg-secondary-positive-button-background-hover active:bg-secondary-positive-button-background-active':
              variant === 'positive',
            'bg-secondary-negative-button-background text-text-negative hover:bg-secondary-negative-button-background-hover active:bg-secondary-negative-button-background-active':
              variant === 'negative',
          },
        )}
        onClick={onClick}
        onMouseOver={onMouseOver}
        onMouseLeave={onMouseLeave}
      >
        {marked && (
          <div
            className={cnTw('absolute top-1 h-1.5 w-1.5 rounded-full', {
              'right-2 bg-icon-positive': variant === 'positive',
              'left-1 bg-icon-negative': variant === 'negative',
            })}
          />
        )}
        <Icon
          name={icon}
          size={16}
          className={cnTw({
            'text-icon-positive': variant === 'positive' && !disabled,
            'text-icon-negative': variant === 'negative' && !disabled,
          })}
        />
      </button>
    );
  },
);
