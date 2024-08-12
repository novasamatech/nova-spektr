import { type PropsWithChildren, forwardRef } from 'react';

import { cnTw } from '@shared/lib/utils';
import { Icon } from '../Icon/Icon';
import { BodyText } from '../Typography';

type Props = PropsWithChildren<{
  className?: string;
}>;

export const LabelHelpBox = forwardRef<HTMLDivElement, Props>(({ className, children }, ref) => (
  <div
    ref={ref}
    className={cnTw(
      'group flex w-fit max-w-full items-center gap-x-1 rounded-md px-2 py-0.5 outline-offset-1',
      'bg-secondary-button-background hover:bg-secondary-button-background-hover active:bg-secondary-button-background-active',
      className,
    )}
    data-testid="labelHelpbox"
  >
    <BodyText>{children}</BodyText>
    <Icon name="questionOutline" className="group-hover:text-icon-hover group-active:text-icon-active" size={16} />
  </div>
));
