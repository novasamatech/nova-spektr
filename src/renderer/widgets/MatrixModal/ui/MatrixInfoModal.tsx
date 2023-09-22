import { useI18n } from '@renderer/app/providers';
import { BaseModal } from '@renderer/shared/ui';
import { MatrixInfoPopover } from './MatrixInfoPopover';
import { Credentials } from './Credentials';
import { Verification } from './Verification';
import { useToggle } from '@renderer/shared/lib/hooks';
import { DEFAULT_TRANSITION } from '@renderer/shared/lib/utils';

type Props = {
  onClose: () => void;
};

export const MatrixInfoModal = ({ onClose }: Props) => {
  const { t } = useI18n();

  const [isModalOpen, toggleIsModalOpen] = useToggle(true);

  const closeMatrixModal = () => {
    toggleIsModalOpen();
    setTimeout(onClose, DEFAULT_TRANSITION);
  };

  return (
    <BaseModal closeButton isOpen={isModalOpen} title={t('settings.matrix.generalTitle')} onClose={closeMatrixModal}>
      <MatrixInfoPopover />
      <div className="flex flex-col gap-y-4">
        <Credentials />
        <Verification />
      </div>
    </BaseModal>
  );
};
