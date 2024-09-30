import { type PropsWithChildren } from 'react';

import { type Contact } from '@shared/core';
import { BodyText, Plate } from '@shared/ui';
import { Address } from '@shared/ui-entities';

type Props = {
  contact: Contact;
};

export const ContactRow = ({ contact, children }: PropsWithChildren<Props>) => {
  return (
    <Plate className="grid grid-cols-[250px,250px,1fr] items-center p-0">
      <div className="flex items-center gap-x-2 p-3 text-body">
        <Address address={contact.address} showIcon iconSize={20} variant="truncate" title={contact.name} />
      </div>
      <BodyText className="truncate p-3 text-text-primary">{contact.matrixId || '-'}</BodyText>
      {children}
    </Plate>
  );
};
