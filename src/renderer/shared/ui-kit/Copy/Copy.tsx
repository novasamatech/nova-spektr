import { Slot } from '@radix-ui/react-slot';
import { type HTMLAttributes, type MouseEvent, type ReactElement, memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { copyToClipboard } from '@/shared/lib/utils';
import { useNotification } from '../NotificationContext';

// TODO move outside as generic type and reuse in all components that can integrate one into another
type RadixIntegration = Pick<
  HTMLAttributes<Element>,
  | 'onClick'
  | 'onMouseDown'
  | 'onMouseUp'
  | 'onMouseEnter'
  | 'onMouseLeave'
  | 'onPointerDown'
  | 'onPointerUp'
  | 'onPointerMove'
  | 'onPointerLeave'
>;

type Props = RadixIntegration & {
  value: string;
  notification?: string;
  children: ReactElement;
};

export const Copy = memo(({ value, notification, children, ...radix }: Props) => {
  const { t } = useI18n();
  const { toast } = useNotification();

  const toastMessage = notification ?? t('general.notifications.copiedToClipboard');

  const onCopyToClipboard = async (e: MouseEvent) => {
    e.stopPropagation();
    await copyToClipboard(value);
    toast.success(toastMessage);
    radix.onClick?.(e);
  };

  return (
    <Slot {...radix} onClick={onCopyToClipboard}>
      {children}
    </Slot>
  );
});
