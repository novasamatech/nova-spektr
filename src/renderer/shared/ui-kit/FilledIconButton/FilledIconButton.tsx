import { type MouseEventHandler } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { Icon } from '@/shared/ui';
import { type IconNames } from '@/shared/ui/types';

type Props = {
  variant: 'positive' | 'negative';
  icon: IconNames;
  disabled?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
};

export const FilledIconButton = ({ variant, disabled, icon, onClick }: Props) => {
  return (
    <button
      type="button"
      className={cnTw('flex h-10.5 w-10.5 items-center justify-center rounded-full', {
        'bg-[#F52163] text-white': variant === 'negative',
        'bg-[#01A63E] text-white': variant === 'positive',
        'opacity-75': disabled,
      })}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon className="text-inherit" name={icon} size={16} />
    </button>
  );
};
