import { Slot } from '@radix-ui/react-slot';
import { type MouseEvent, type ReactElement, memo } from 'react';
import { toast } from 'sonner';

import { useI18n } from '@/shared/i18n';
import { cnTw, copyToClipboard } from '@/shared/lib/utils';

type Props = {
  value: string;
  notification?: string;
  className?: string;
  children: ReactElement;
  testId?: string;
};

export const Copy = memo(({ value, notification, children, className, testId = 'Copy' }: Props) => {
  const { t } = useI18n();

  const toastMessage = notification ?? t('general.notifications.copiedToClipboard');

  const onCopyToClipboard = async (e: MouseEvent) => {
    e.stopPropagation();
    await copyToClipboard(value);
    toast.success(toastMessage);
  };

  return (
    <Slot role="button" className={cnTw('cursor-pointer', className)} data-testid={testId} onClick={onCopyToClipboard}>
      {children}
    </Slot>
  );
});
