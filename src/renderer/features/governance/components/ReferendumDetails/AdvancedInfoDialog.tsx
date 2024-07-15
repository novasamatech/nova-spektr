import { BaseModal } from '@shared/ui';
import { useI18n } from '@app/providers';
import { useModalClose } from '@shared/lib/hooks';

type Props = {
  onClose: VoidFunction;
};

export const AdvancedInfoDialog = ({ onClose }: Props) => {
  const { t } = useI18n();
  const [isOpen, closeModal] = useModalClose(true, onClose);

  return (
    <BaseModal
      closeButton
      isOpen={isOpen}
      panelClass="w-modal"
      title={t('governance.advanced.title')}
      onClose={closeModal}
    ></BaseModal>
  );
};
