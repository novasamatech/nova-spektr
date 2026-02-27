import { Fragment } from 'react';

import { type BackendContact, type Contact } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { FootnoteText, IconButton, Plate } from '@/shared/ui';
import { Address } from '@/shared/ui-entities';
import { Copy, Label } from '@/shared/ui-kit';

type Props = {
  contact: BackendContact;
  onSendTo?: (contact: Contact) => void;
};

export const BackendContactRow = ({ contact, onSendTo }: Props) => {
  const { t } = useI18n();

  const handleSendTo = () => {
    onSendTo?.(contact);
  };

  return (
    <li>
      <Plate className="flex flex-col gap-y-2.5 border border-transparent p-3 transition-colors duration-150 hover:border-filter-border">
        <div className="flex items-center">
          <div className="flex min-w-0 gap-x-1">
            <Address address={contact.address} showIcon iconSize={20} variant="truncate" title={contact.name} />
          </div>
          <div className="ml-auto flex items-center gap-x-1">
            <IconButton
              className="shrink-0 text-icon-default"
              name="sendArrow"
              ariaLabel={t('addressBook.a11y.sendTo', { name: contact.name })}
              onClick={handleSendTo}
            />
            <Copy value={contact.address} notification={t('general.notifications.addressCopied')}>
              <IconButton
                className="shrink-0 text-icon-default"
                name="copy"
                ariaLabel={t('addressBook.a11y.copyAddress', { name: contact.name })}
              />
            </Copy>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {contact.categoryName && <Label variant="blue">{contact.categoryName}</Label>}
          {contact.contactTypeName && <Label variant="gray">{contact.contactTypeName}</Label>}
          {contact.chainName && <Label variant="lightBlue">{contact.chainName}</Label>}
          {contact.entityNames.map((entityName) => (
            <Fragment key={entityName}>
              <FootnoteText className="text-text-tertiary">
                {/* eslint-disable-next-line i18next/no-literal-string */}
                {'\u00b7'}
              </FootnoteText>
              <Label variant="purple">{entityName}</Label>
            </Fragment>
          ))}
        </div>
      </Plate>
    </li>
  );
};
