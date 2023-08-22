import { PropsWithChildren } from 'react';

import { FootnoteText, Icon } from '@renderer/shared/ui';
import { cnTw } from '@renderer/shared/lib/utils';

type Props = {
  className?: string;
  disabled?: boolean;
};

export const LabelHelpBox = ({ className, children, disabled = false, ...props }: PropsWithChildren<Props>) => (
  <div
    className={cnTw(
      'flex gap-x-1 items-center rounded-md py-1.5b px-2b group outline-offset-1',
      'bg-button-secondary-default hover:bg-button-secondary-hover active:bg-button-secondary-active',
      className,
    )}
    data-testid="labelHelpbox"
    {...props}
  >
    <FootnoteText className={cnTw('text-text-primary', disabled && 'text-text-tertiary')}>{children}</FootnoteText>
    <Icon
      name="learn-more"
      className="text-icon-primary-default group-hover:text-icon-primary-hover group-active:text-icon-primary-active"
      size={16}
    />
  </div>
);
