import { ComponentProps } from 'react';

import { Popover } from '@shared/ui';
import { cnTw } from '@shared/lib/utils';
import { Horizontal } from '../common/types';
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
    contentClass={cnTw('py-1 px-2', contentClass)}
    wrapperClass={wrapperClass}
    panelClass={cnTw(
      'max-w-[184px] bg-switch-background-active rounded w-max rounded border-none shadow-none',
      'spektr-arrow spektr-arrow__' + pointer,
      'spektr-arrow__' + arrow,
      panelClass,
    )}
    content={<div className=" text-help-text text-white">{content}</div>}
  >
    {children}
  </Popover>
);
