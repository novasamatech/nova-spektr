import { type Contact } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { IconButton } from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui-kit';
import { contactModel } from '@/entities/contact';

type Props = {
  name: Contact['name'];
  contactId: Contact['id'];
};
export const RemoveContactModal = ({ name, contactId }: Props) => {
  const { t } = useI18n();

  const onDelete = async () => {
    await contactModel.effects.deleteContactFx(contactId);
  };

  return (
    <ConfirmModal
      title={t('addressBook.removeConfirm.title')}
      description={t('addressBook.removeConfirm.description', { name })}
      cancelText={t('addressBook.removeConfirm.cancelButton')}
      confirmText={t('addressBook.removeConfirm.confirmButton')}
      type="warning"
      onConfirm={onDelete}
    >
      <ConfirmModal.Trigger>
        <IconButton name="delete" className="p-2" />
      </ConfirmModal.Trigger>
    </ConfirmModal>
  );
};
