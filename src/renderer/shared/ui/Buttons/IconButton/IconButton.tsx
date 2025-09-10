import { type ComponentProps, forwardRef } from 'react';

import { cnTw, tw } from '@/shared/lib/utils';
import { Icon } from '../../Icon/Icon';
import './IconButton.css';

type IconProps = ComponentProps<typeof Icon>;

const getIconButtonStyle = (disabled?: boolean) =>
  tw`relative h-fit w-fit w-max shrink-0 cursor-pointer justify-center rounded-full text-icon-default outline-offset-1 transition-colors` +
  (disabled
    ? tw` cursor-not-allowed`
    : tw` hover:bg-hover hover:text-icon-hover focus:bg-hover focus:text-icon-hover active:bg-hover active:text-tab-icon-active`);

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
      className={cnTw('spektr-icon-button p-1.5', getIconButtonStyle(disabled), className)}
      aria-label={ariaLabel || `icon button: ${iconProps.name}`}
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
