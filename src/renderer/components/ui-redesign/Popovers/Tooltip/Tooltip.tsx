import { ComponentProps } from 'react';

import { Popover } from '@renderer/components/ui-redesign';
import cnTw from '@renderer/shared/utils/twMerge';
import { HelpText } from '../../Typography';

type PopoverProps = ComponentProps<typeof Popover>;

// TODO add pointer triangle

export const Tooltip = ({ offsetPx = 8, content, position, contentClass, children }: PopoverProps) => (
  <Popover
    offsetPx={offsetPx}
    contentClass={cnTw('py-1 px-2 bg-switch-background-active rounded w-max', contentClass)}
    position={cnTw('left-1/2 -translate-x-1/2', position)}
    content={<HelpText className="text-button-text">{content}</HelpText>}
  >
    {children}
  </Popover>
);
