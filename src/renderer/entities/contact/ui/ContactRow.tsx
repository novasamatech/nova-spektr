import { useNavigate } from 'react-router-dom';

import { type Contact } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Paths, createLink } from '@/shared/routes';
import { IconButton, Plate } from '@/shared/ui';
import { Address } from '@/shared/ui-entities';
import { Copy, useNotification } from '@/shared/ui-kit';
import { contactModel } from '../model/contact-model';

type Props = {
  contact: Contact;
};

export const ContactRow = ({ contact }: Props) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { toast } = useNotification();

  const handleEdit = () => {
    navigate(createLink(Paths.EDIT_CONTACT, {}, { id: [contact.id] }));
  };

  const handleDelete = () => {
    toast.success(t('addressBook.contactDeleted'), {
      action: {
        label: t('addressBook.undo'),
        onClick: () => contactModel.effects.createContactFx(contact),
      },
    });
    contactModel.effects.deleteContactFx(contact.id);
  };

  return (
    <Plate className="flex p-0">
      <div className="flex min-w-0 gap-x-1 p-3">
        <Address address={contact.address} showIcon iconSize={20} variant="truncate" title={contact.name} />
      </div>
      <div className="ml-auto flex items-center gap-x-2 p-3">
        <Copy value={contact.address} notification={t('general.notifications.addressCopied')}>
          <IconButton className="shrink-0 self-center text-icon-default" name="copy" />
        </Copy>

        <IconButton className="shrink-0 self-center text-icon-default" name="edit" onClick={handleEdit} />

        <IconButton className="shrink-0 self-center text-icon-default" name="delete" onClick={handleDelete} />
      </div>
    </Plate>
  );
};
