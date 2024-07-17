import { type PropsWithChildren } from 'react';

import { BodyText, IconButton, Identicon, Plate, Truncate } from '@shared/ui';
import { copyToClipboard } from '@shared/lib/utils';
import type { Contact } from '@shared/core';

type Props = {
  contact: Contact;
};

export const ContactRow = ({ contact, children }: PropsWithChildren<Props>) => {
  return (
    <Plate className="grid grid-cols-[250px,250px,1fr] items-center p-0">
      <div className="flex items-center gap-x-2 p-3">
        <Identicon address={contact.address} size={20} background={false} />
        <div className="overflow-hidden">
          <BodyText className="truncate">{contact.name}</BodyText>
          <div className="flex items-center gap-1 text-text-tertiary">
            <Truncate className="text-help-text" ellipsis="..." start={4} end={4} text={contact.address} />
            <IconButton name="copy" onClick={() => copyToClipboard(contact.address)} />
          </div>
        </div>
      </div>
      <BodyText className="text-text-primary p-3 truncate">{contact.matrixId || '-'}</BodyText>
      {children}
    </Plate>
  );
};
