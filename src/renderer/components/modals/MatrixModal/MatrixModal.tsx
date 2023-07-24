import { useI18n, useMatrix } from '@renderer/app/providers';
import { BaseModal } from '@renderer/shared/ui';
import MatrixInfoPopover from './components/MatrixInfoPopover/MatrixInfoPopover';
import Credentials from './components/Credentials/Credentials';
import Verification from './components/Verification/Verification';
import LoginForm from './components/LoginForm/LoginForm';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export const MatrixModal = ({ isOpen, onClose }: Props) => {
  const { t } = useI18n();
  const { isLoggedIn, matrix } = useMatrix();
  const isVerified = matrix.sessionIsVerified;

  return (
    <BaseModal
      closeButton
      isOpen={isOpen}
      title={isVerified ? t('settings.matrix.verificationTitle') : t('settings.matrix.logInTitle')}
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
