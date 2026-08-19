import { type ComponentProps } from 'react';

import { type BackendContact, type Contact } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { FootnoteText, Icon, IconButton, Plate } from '@/shared/ui';
import { Address } from '@/shared/ui-entities';
import { Copy, Label, Tooltip } from '@/shared/ui-kit';

type Props = {
  contact: BackendContact;
  onSendTo?: (contact: Contact) => void;
};

type LabelVariant = ComponentProps<typeof Label>['variant'];

const FIELD_LABEL_VARIANTS: LabelVariant[] = ['blue', 'purple', 'orange', 'green', 'gray'];

// Fields are admin-defined, so chip colors can't be hardcoded per field — pick a
// stable variant from the field name instead.
const getFieldLabelVariant = (fieldName: string): LabelVariant => {
  let hash = 0;
  for (let i = 0; i < fieldName.length; i++) {
    hash = (hash * 31 + fieldName.charCodeAt(i)) | 0;
  }

  return FIELD_LABEL_VARIANTS[Math.abs(hash) % FIELD_LABEL_VARIANTS.length]!;
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
            <Tooltip enableHover delay={200}>
              <Tooltip.Trigger>
                <div className="flex items-center gap-x-1 text-text-tertiary">
                  <Icon name="lock" size={14} />
                  <FootnoteText className="text-text-tertiary">{t('addressBook.backendContact.synced')}</FootnoteText>
                </div>
              </Tooltip.Trigger>
              <Tooltip.Content>{t('addressBook.backendContact.managedTooltip')}</Tooltip.Content>
            </Tooltip>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {contact.chainName && <Label variant="lightBlue">{contact.chainName}</Label>}
          {!nullable(contact.threshold) && !nullable(contact.signatories) && (
            <Label variant="darkGray">
              {contact.threshold}/{contact.signatories.length}
            </Label>
          )}
          {contact.fields.map((field) =>
            field.values.map((optionValue) => (
              <Label key={optionValue.optionId} variant={getFieldLabelVariant(field.fieldName)}>
                {field.fieldName}: {optionValue.value}
              </Label>
            )),
          )}
        </div>
      </Plate>
    </li>
  );
};
