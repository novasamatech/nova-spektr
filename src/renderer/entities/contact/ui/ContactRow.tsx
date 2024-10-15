import { type PropsWithChildren } from 'react';

import { type Contact } from '@shared/core';
import { Plate } from '@shared/ui';
import { Address } from '@shared/ui-entities';

type Props = {
  contact: Contact;
};

export const ContactRow = ({ contact, children }: PropsWithChildren<Props>) => {
  return (
    <Plate className="flex p-0">
      <div className="flex flex-1 items-center gap-x-2 p-3">
        <Address address={contact.address} showIcon iconSize={20} variant="truncate" title={contact.name} />
      </div>
      {children}
    </Plate>
  );
};
