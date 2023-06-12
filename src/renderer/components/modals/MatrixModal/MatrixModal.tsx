import { useI18n } from '@renderer/context/I18nContext';
import { useMatrix } from '@renderer/context/MatrixContext';
import { BaseModal } from '@renderer/components/ui-redesign';
import MatrixInfoPopover from './components/MatrixInfoPopover/MatrixInfoPopover';
import Credentials from './components/Credentials/Credentials';
import Verification from './components/Verification/Verification';
import LoginForm from './components/LoginForm/LoginForm';

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
