import { useI18n } from '@renderer/context/I18nContext';
import { useMatrix } from '@renderer/context/MatrixContext';
import { BaseModal } from '@renderer/components/ui-redesign';
import MatrixInfoPopover from '@renderer/components/modals/MatrixModal/components/MatrixInfoPopover/MatrixInfoPopover';
import LoginForm from '@renderer/components/modals/MatrixModal/components/LoginForm/LoginForm';
import Credentials from '@renderer/components/modals/MatrixModal/components/Credentials/Credentials';
import Verification from '@renderer/components/modals/MatrixModal/components/Verification/Verification';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const MatrixModal = ({ isOpen, onClose }: Props) => {
  const { t } = useI18n();
  const { isLoggedIn, matrix } = useMatrix();
  const isVerified = matrix.sessionIsVerified;

  return (
    <BaseModal
      isOpen={isOpen}
      title={isVerified ? t('settings.matrix.verificationTitle') : t('settings.matrix.logInTitle')}
      closeButton
      onClose={onClose}
    >
      <MatrixInfoPopover />
      {isLoggedIn ? (
        <div className="flex flex-col gap-y-4">
          <Credentials onLogOut={onClose} />
          <Verification />
        </div>
      ) : (
        <LoginForm />
      )}
    </BaseModal>
  );
};

export default MatrixModal;
