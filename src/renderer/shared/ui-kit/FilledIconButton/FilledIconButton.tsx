import { type MouseEventHandler, type PropsWithChildren, memo } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { Icon, type IconNames } from '@/shared/ui';

type Props = PropsWithChildren<{
  variant: 'positive' | 'negative';
  icon: IconNames;
  checked?: boolean;
  marked?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  onMouseOver?: MouseEventHandler<HTMLButtonElement>;
  onMouseLeave?: MouseEventHandler<HTMLButtonElement>;
}>;

export const FilledIconButton = memo(
  ({ variant, disabled, checked, marked, icon, onClick, onMouseOver, onMouseLeave, children, fullWidth }: Props) => {
    return (
      <button
        type="button"
        disabled={disabled}
        className={cnTw(
          'flex cursor-pointer appearance-none flex-col items-center gap-2 rounded-lg px-4 py-3',
          'disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-secondary-button-background disabled:text-text-tertiary',
          {
            'pointer-events-auto': !checked,
          },
          {
            'bg-alert-background-negative text-text-negative': variant === 'negative' && !disabled,
            'bg-alert-background-positive text-text-positive': variant === 'positive' && !disabled,
          },
          {
            'bg-label-background-red': variant === 'negative' && marked && !disabled,
            'hover:bg-badge-red-background': variant === 'negative' && !marked && !disabled,
            'bg-label-background-green': variant === 'positive' && marked && !disabled,
            'hover:bg-badge-green-background': variant === 'positive' && !marked && !disabled,
          },
          {
            'w-full': fullWidth,
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
            'text-text-tertiary': disabled,
          })}
        />
        {children ? (
          <span
            className={cnTw('text-button-large', {
              'text-icon-negative': variant === 'negative' && !disabled,
              'text-icon-positive': variant === 'positive' && !disabled,
              'text-icon-button': marked && !disabled,
              'text-text-tertiary': disabled,
            })}
          >
            {children}
          </span>
        ) : null}
      </button>
    );
  },
);
