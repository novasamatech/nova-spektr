import { ComponentProps } from 'react';

import { Popover } from '@shared/ui';
import { cnTw } from '@shared/lib/utils';
import { HelpText } from '../../Typography';
import './Tooltip.css';

type PopoverProps = ComponentProps<typeof Popover> & { pointer?: 'up' | 'down'; position?: 'start' | 'center' | 'end' };

export const Tooltip = ({
  offsetPx = 8,
  content,
  panelClass,
  contentClass,
  pointer = 'down',
  position = 'center',
  children,
}: PopoverProps) => (
  <Popover
    offsetPx={offsetPx}
    role="tooltip"
    contentClass={cnTw('py-1 px-2', contentClass)}
    panelClass={cnTw(
      'max-w-[184px] left-1/2 -translate-x-1/2 bg-switch-background-active rounded w-max rounded border-none shadow-none',
      'spektr-arrow spektr-arrow__' + pointer,
      'spektr-arrow__' + position,
      panelClass,
    )}
    content={<HelpText className="text-white">{content}</HelpText>}
  >
    {children}
  </Popover>
);
