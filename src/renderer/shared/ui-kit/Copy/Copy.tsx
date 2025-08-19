import { Slot } from '@radix-ui/react-slot';
import { type MouseEvent, type ReactElement, memo } from 'react';
import { toast } from 'sonner';

import { useI18n } from '@/shared/i18n';
import { copyToClipboard } from '@/shared/lib/utils';

type Props = {
  value: string;
  notification?: string;
  children: ReactElement;
};

export const Copy = memo(({ value, notification, children }: Props) => {
  const { t } = useI18n();

  const toastMessage = notification ?? t('general.notifications.copiedToClipboard');

  const onCopyToClipboard = async (e: MouseEvent) => {
    e.stopPropagation();
    await copyToClipboard(value);
    toast.success(toastMessage);
  };

  return <Slot onClick={onCopyToClipboard}>{children}</Slot>;
});
