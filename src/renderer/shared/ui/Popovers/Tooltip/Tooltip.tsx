import { ComponentProps } from 'react';

import { Popover } from '@renderer/shared/ui';
import { cnTw } from '@renderer/shared/lib/utils';
import { HelpText } from '../../Typography';
import './Tooltip.css';

type PointerDirection = 'up' | 'down';
type PointerPosition = 'start' | 'center' | 'end';
type PopoverProps = ComponentProps<typeof Popover> & {
  pointerDirection?: PointerDirection;
  pointerPosition?: PointerPosition;
};

const PointerPositionStyle = {
  start: '-ml-[50%] -translate-x-[2px]',
  center: 'left-1/2 -translate-x-1/2',
  end: 'right-0 -mr-[50%] translate-x-[2px]',
};

export const Tooltip = ({
  offsetPx = 8,
  content,
  panelClass,
  contentClass,
  pointerDirection = 'down',
  pointerPosition = 'start',
  children,
}: PopoverProps) => (
  <Popover
    offsetPx={offsetPx}
    role="tooltip"
    contentClass={cnTw('py-2 px-2', contentClass)}
    panelClass={cnTw(
      'max-w-[184px] bg-bg-black rounded w-max border-none shadow-none',
      'spektr-arrow spektr-arrow__' + pointerDirection,
      'spektr-arrow__' + pointerPosition,
      PointerPositionStyle[pointerPosition],
      panelClass,
    )}
    content={<HelpText className="text-white">{content}</HelpText>}
  >
    {children}
  </Popover>
);
