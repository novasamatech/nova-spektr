import { ComponentProps } from 'react';

import { Popover } from '@renderer/components/ui-redesign';
import cnTw from '@renderer/shared/utils/twMerge';
import { HelpText } from '../../Typography';
import './Tooltip.css';

type PopoverProps = ComponentProps<typeof Popover> & { pointer?: 'up' | 'down' };

export const Tooltip = ({
  offsetPx = 8,
  content,
  panelClass,
  contentClass,
  pointer = 'down',
  children,
}: PopoverProps) => (
  <Popover
    offsetPx={offsetPx}
    contentClass={cnTw('py-1 px-2', contentClass)}
    panelClass={cnTw(
      'left-1/2 -translate-x-1/2 bg-switch-background-active rounded w-max rounded border-none shadow-none',
      'pointer-' + pointer,
      panelClass,
    )}
    content={<HelpText className="text-button-text">{content}</HelpText>}
  >
    {children}
  </Popover>
);
