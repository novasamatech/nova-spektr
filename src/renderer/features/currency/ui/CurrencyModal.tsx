import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { DEFAULT_TRANSITION } from '@/shared/lib/utils';
import { Modal } from '@/shared/ui-kit';
import { CurrencyForm } from '../CurrencyForm';

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
    <Modal isOpen={isModalOpen} size="sm" onToggle={closeFiatModal}>
      <Modal.Title close>{t('settings.currency.modalTitle')}</Modal.Title>
      <Modal.Content>
        <div className="px-5 py-4">
          <CurrencyForm onSubmit={closeFiatModal} />
        </div>
      </Modal.Content>
    </Modal>
  );
};
