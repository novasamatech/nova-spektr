import { BaseModal } from '@renderer/shared/ui';
import { useToggle } from '@renderer/shared/lib/hooks';
import { useI18n } from '@renderer/app/providers';
import { DEFAULT_TRANSITION } from '@renderer/shared/lib/utils';
import { CurrencyForm } from '@renderer/features/currency';

type Props = {
  onClose: () => void;
};

export const CurrencyModal = ({ onClose }: Props) => {
  const { t } = useI18n();

  const [isModalOpen, toggleIsModalOpen] = useToggle(true);

  const closeFiatModal = () => {
    toggleIsModalOpen();
    setTimeout(onClose, DEFAULT_TRANSITION);
  };

  return (
    <BaseModal
      closeButton
      isOpen={isModalOpen}
      contentClass="py-4 px-5"
      panelClass="w-[440px]"
      title={t('settings.currency.modalTitle')}
      onClose={closeFiatModal}
    >
      <CurrencyForm onSubmit={closeFiatModal} />
    </BaseModal>
  );
};
