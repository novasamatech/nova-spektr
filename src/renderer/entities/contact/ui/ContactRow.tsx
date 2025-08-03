import { type PropsWithChildren } from 'react';

import { type Contact } from '@/shared/core';
import { copyToClipboard } from '@/shared/lib/utils';
import { IconButton, Plate } from '@/shared/ui';
import { Address } from '@/shared/ui-entities';

type Props = {
  contact: Contact;
};

export const ContactRow = ({ contact, children }: PropsWithChildren<Props>) => {
  return (
    <Plate className="flex p-0">
      <div className="flex gap-x-2 p-3">
        <Address address={contact.address} showIcon iconSize={20} variant="truncate" title={contact.name} />
        <IconButton
          className="text-icon-default shrink-0 self-end"
          name="copy"
          onClick={() => copyToClipboard(contact.address)}
        />
      </div>
      <div className="ml-auto flex items-center gap-x-3 p-3">{children}</div>
    </Plate>
  );
};
