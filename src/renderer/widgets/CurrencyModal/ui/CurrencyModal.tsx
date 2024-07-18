import { useI18n } from '@app/providers';
import { useToggle } from '@shared/lib/hooks';
import { DEFAULT_TRANSITION } from '@shared/lib/utils';
import { BaseModal } from '@shared/ui';
import { CurrencyForm } from '@features/currency';

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
