import { type ComponentProps } from 'react';

import { cnTw } from '@shared/lib/utils';
import { Popover } from '../Popover/Popover';
import { type Horizontal } from '../common/types';
import './Tooltip.css';

type PopoverProps = ComponentProps<typeof Popover> & {
  arrow?: Horizontal;
  pointer?: 'up' | 'down';
};

export const Tooltip = ({
  offsetPx = 8,
  content,
  panelClass,
  contentClass,
  wrapperClass,
  pointer = 'down',
  arrow = 'center',
  children,
}: PopoverProps) => (
  <Popover
    role="tooltip"
    offsetPx={offsetPx}
    contentClass={cnTw('px-2 py-1', contentClass)}
    wrapperClass={wrapperClass}
    panelClass={cnTw(
      'text-text-white w-max max-w-[184px] rounded border-none bg-switch-background-active shadow-none',
      'spektr-arrow spektr-arrow__' + pointer,
      'spektr-arrow__' + arrow,
      panelClass,
    )}
    content={<div className="text-help-text text-white">{content}</div>}
  >
    {children}
  </Popover>
);
