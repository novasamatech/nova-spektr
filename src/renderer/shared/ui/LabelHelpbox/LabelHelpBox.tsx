import { type PropsWithChildren } from 'react';

import { BodyText, Icon } from '@shared/ui';
import { cnTw } from '@shared/lib/utils';

type Props = {
  className?: string;
};

export const LabelHelpBox = ({ className, children }: PropsWithChildren<Props>) => (
  <div
    className={cnTw(
      'flex gap-x-1 items-center rounded-md py-0.5 px-2 group outline-offset-1',
      'bg-secondary-button-background hover:bg-secondary-button-background-hover active:bg-secondary-button-background-active',
      className,
    )}
    data-testid="labelHelpbox"
  >
    <BodyText>{children}</BodyText>
    <Icon name="questionOutline" className="group-hover:text-icon-hover group-active:text-icon-active" size={16} />
  </div>
);
