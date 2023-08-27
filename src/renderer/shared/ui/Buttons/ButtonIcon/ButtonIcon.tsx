import { MouseEvent } from 'react';

import { cnTw } from '@renderer/shared/lib/utils';
import { Icon } from '../../Icon/Icon';
import { IconNames } from '../../Icon/data';
import { ButtonStyle, ButtonStyleWithBG, IconStyle, SizeStyle, SizeStyleWithBG } from './common/constants';

type Props = {
  ariaLabel?: string;
  className?: string;
  background?: boolean;
  icon: IconNames;
  size?: keyof typeof SizeStyle;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
};

export const ButtonIcon = ({ ariaLabel, icon, size = 'md', background, className, onClick }: Props) => (
  <button
    type="button"
    data-testid={`${icon}-button`}
    className={cnTw(
      'group flex items-center justify-center select-none outline-offset-1',
      background ? ButtonStyleWithBG : ButtonStyle,
      background ? SizeStyleWithBG[size] : SizeStyle[size],
      className,
    )}
    aria-label={ariaLabel}
    onClick={onClick}
  >
    <Icon size={size === 'sm' ? 16 : 20} name={icon} className={IconStyle} />
  </button>
);
