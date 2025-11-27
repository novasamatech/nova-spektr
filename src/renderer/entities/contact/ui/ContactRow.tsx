import { useNavigate } from 'react-router-dom';

import { type Contact } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Paths, createLink } from '@/shared/routes';
import { FootnoteText, Icon, IconButton, Plate } from '@/shared/ui';
import { Address } from '@/shared/ui-entities';
import { ConfirmModal, Copy, Dropdown } from '@/shared/ui-kit';
import { contactModel } from '../model/contact-model';

type Props = {
  contact: Contact;
};

export const ContactRow = ({ contact }: Props) => {
  const { t } = useI18n();
  const navigate = useNavigate();

  const handleEdit = () => {
    navigate(createLink(Paths.EDIT_CONTACT, {}, { id: [contact.id] }));
  };

  const onDelete = async () => {
    await contactModel.effects.deleteContactFx(contact.id);
  };

  return (
    <Plate className="flex p-0">
      <div className="flex min-w-0 gap-x-1 p-3">
        <Address address={contact.address} showIcon iconSize={20} variant="truncate" title={contact.name} />
      </div>
      <div className="ml-auto flex items-center gap-x-3 p-3">
        <Copy value={contact.address} notification={t('general.notifications.addressCopied')}>
          <IconButton className="shrink-0 self-center text-icon-default" name="copy" />
        </Copy>

        <Dropdown>
          <Dropdown.Trigger>
            <IconButton name="more" />
          </Dropdown.Trigger>
          <Dropdown.Content>
            <Dropdown.Item onSelect={handleEdit}>
              <Icon name="edit" size={16} className="text-icon-accent" />
              <FootnoteText className="text-text-secondary">{t('addressBook.actions.edit')}</FootnoteText>
            </Dropdown.Item>
            <Dropdown.Item onSelect={onDelete}>
              <ConfirmModal
                title={t('addressBook.removeConfirm.title')}
                description={t('addressBook.removeConfirm.description', { name: contact.name })}
                cancelText={t('addressBook.removeConfirm.cancelButton')}
                confirmText={t('addressBook.removeConfirm.confirmButton')}
                type="warning"
                onConfirm={onDelete}
              >
                <ConfirmModal.Trigger>
                  <button className="flex items-center gap-2">
                    <Icon name="delete" size={16} className="text-icon-accent" />
                    <FootnoteText className="text-text-secondary">{t('addressBook.actions.delete')}</FootnoteText>
                  </button>
                </ConfirmModal.Trigger>
              </ConfirmModal>
            </Dropdown.Item>
          </Dropdown.Content>
        </Dropdown>
      </div>
    </Plate>
  );
};
