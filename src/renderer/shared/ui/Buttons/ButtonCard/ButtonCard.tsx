import noop from 'lodash/noop';
import { type MouseEvent, type PropsWithChildren, forwardRef } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { Icon } from '../../Icon/Icon';
import { type IconNames } from '../../Icon/data';

type Props = {
  className?: string;
  type?: 'button' | 'submit';
  icon: IconNames;
  fullWidth?: boolean;
  pallet?: 'positive' | 'secondary' | 'negative';
  disabled?: boolean;
  tabIndex?: number;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
};

export const ButtonCard = forwardRef<HTMLButtonElement, PropsWithChildren<Props>>(
  (
    { pallet = 'secondary', type = 'button', fullWidth, icon, className, disabled, tabIndex, children, onClick = noop },
    ref,
  ) => {
    const iconNode = (
      <Icon
        name={icon}
        size={16}
        className={cnTw({
          'text-icon-default': disabled,
          'text-icon-positive': pallet === 'positive' && !disabled,
          'text-icon-negative': pallet === 'negative' && !disabled,
          'text-chip-icon': pallet === 'secondary' && !disabled,
        })}
      />
    );

    return (
      <button
        ref={ref}
        type={type}
        tabIndex={tabIndex}
        disabled={disabled}
        className={cnTw(
          'flex appearance-none flex-col items-center gap-2 rounded-lg px-6 py-4',
          'disabled:bg-secondary-button-background disabled:text-text-tertiary',
          {
            'bg-secondary-positive-button-background text-text-positive hover:bg-secondary-positive-button-background-hover active:bg-secondary-positive-button-background-active':
              pallet === 'positive',
            'bg-secondary-negative-button-background text-text-negative hover:bg-secondary-negative-button-background-hover active:bg-secondary-negative-button-background-active':
              pallet === 'negative',
            'bg-secondary-button-background text-text-primary hover:bg-secondary-button-background-hover active:bg-secondary-button-background-active':
              pallet === 'secondary',
            'w-full': fullWidth,
          },
          className,
        )}
        onClick={onClick}
      >
        {iconNode}
        <span className="text-button-large">{children}</span>
      </button>
    );
  },
);
