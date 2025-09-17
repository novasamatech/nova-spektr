import { type PropsWithChildren } from 'react';

import { type Contact } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { IconButton, Plate } from '@/shared/ui';
import { Address } from '@/shared/ui-entities';
import { Copy } from '@/shared/ui-kit';

type Props = {
  contact: Contact;
};

export const ContactRow = ({ contact, children }: PropsWithChildren<Props>) => {
  const { t } = useI18n();

  return (
    <Plate className="flex p-0">
      <div className="flex min-w-0 gap-x-1 p-3">
        <Address address={contact.address} showIcon iconSize={20} variant="truncate" title={contact.name} />
        <Copy value={contact.address} notification={t('general.notifications.addressCopied')}>
          <IconButton className="shrink-0 self-center text-icon-default" name="copy" />
        </Copy>
      </div>
      <div className="ml-auto flex items-center gap-x-3 p-3">{children}</div>
    </Plate>
  );
};
