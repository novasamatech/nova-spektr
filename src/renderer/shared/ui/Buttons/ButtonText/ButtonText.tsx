import { MouseEvent, PropsWithChildren } from 'react';

import { SizeStyle, IconStyle, TextStyle } from './common/constants';
import { IconNames } from '../../Icon/data';
import { cnTw } from '@renderer/shared/lib/utils';
import { Icon } from '@renderer/shared/ui';

type Props = {
  className?: string;
  size?: keyof typeof SizeStyle;
  disabled?: boolean;
  icon?: IconNames;
  children?: string;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
};

export const ButtonText = ({ className, size = 'md', disabled, icon, children, onClick }: PropsWithChildren<Props>) => (
  <button
    type="button"
    disabled={disabled}
    className={cnTw(
      'group flex items-center justify-center gap-x-1.5 select-none outline-offset-1',
      SizeStyle[size],
      className,
    )}
    onClick={onClick}
  >
    {icon && <Icon name={icon} size={20} className={IconStyle} />}
    <span className={TextStyle[size]}>{children}</span>
  </button>
);
