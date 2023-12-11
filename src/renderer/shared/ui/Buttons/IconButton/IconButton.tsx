import { ComponentProps, MouseEvent } from 'react';

import { cnTw } from '@shared/lib/utils';
import Icon from '../../Icon/Icon';
import './IconButton.css';

type IconProps = ComponentProps<typeof Icon>;

const IconButtonStyle =
  'relative w-max justify-center rounded-full outline-offset-1 text-icon-default transition-colors ' +
  'hover:text-icon-hover hover:bg-hover active:bg-hover active:text-tab-icon-active ' +
  'focus:text-icon-hover focus:bg-hover';

type Props = {
  ariaLabel?: string;
  disabled?: boolean;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
} & IconProps;

export const IconButton = ({ onClick, size = 16, disabled, className, ariaLabel, ...iconProps }: Props) => (
  <button
    type="button"
    className={cnTw('spektr-icon-button', IconButtonStyle, className)}
    aria-label={ariaLabel}
    disabled={disabled}
    onClick={onClick}
  >
    <Icon size={size} className="text-inherit" {...iconProps} />
  </button>
);
