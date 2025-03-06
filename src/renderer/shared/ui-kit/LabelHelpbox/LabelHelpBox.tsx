import { type PropsWithChildren, forwardRef } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { BodyText, Icon } from '@/shared/ui';

export const LabelHelpBox = forwardRef<HTMLDivElement, PropsWithChildren>(({ children }, ref) => (
  <div
    ref={ref}
    className={cnTw(
      'group flex w-fit max-w-full items-center gap-x-1 rounded-md px-2 py-0.5 outline-offset-1',
      'bg-secondary-button-background hover:bg-secondary-button-background-hover active:bg-secondary-button-background-active',
    )}
    data-testid="labelHelpBox"
  >
    <BodyText>{children}</BodyText>
    <Icon name="questionOutline" className="group-hover:text-icon-hover group-active:text-icon-active" size={16} />
  </div>
));
