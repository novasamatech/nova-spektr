import { type ComponentProps, forwardRef } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { Icon } from '../../Icon/Icon';
import './IconButton.css';

type IconProps = ComponentProps<typeof Icon>;

const IconButtonStyle =
  'relative w-max justify-center rounded-full outline-offset-1 text-icon-default transition-colors ' +
  'hover:text-icon-hover hover:bg-hover active:bg-hover active:text-tab-icon-active ' +
  'focus:text-icon-hover focus:bg-hover';

type HTMLButtonProps = Pick<
  ComponentProps<'button'>,
  | 'onClick'
  | 'onMouseDown'
  | 'onPointerDown'
  | 'onPointerMove'
  | 'onPointerLeave'
  | 'onKeyDown'
  | 'disabled'
  | 'tabIndex'
  | 'type'
>;

type Props = HTMLButtonProps &
  IconProps & {
    ariaLabel?: string;
    testId?: string;
  };

export const IconButton = forwardRef<HTMLButtonElement, Props>(
  (
    {
      size = 16,
      disabled,
      className,
      ariaLabel,
      onClick,
      onMouseDown,
      onPointerDown,
      onPointerMove,
      onPointerLeave,
      onKeyDown,
      testId,
      ...iconProps
    },
    ref,
  ) => (
    <button
      ref={ref}
      type="button"
      className={cnTw('spektr-icon-button', IconButtonStyle, className)}
      aria-label={ariaLabel}
      disabled={disabled}
      data-testid={testId}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onKeyDown={onKeyDown}
    >
      <Icon size={size} className="text-inherit" {...iconProps} />
    </button>
  ),
);
