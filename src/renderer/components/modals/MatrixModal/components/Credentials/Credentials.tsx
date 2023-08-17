import { useI18n, useMatrix } from '@renderer/app/providers';
import { useToggle } from '@renderer/shared/lib/hooks';
import { Button, FootnoteText, StatusMark } from '@renderer/shared/ui';

type Props = {
  onLogOut: () => void;
};

const Credentials = ({ onLogOut }: Props) => {
  const { t } = useI18n();
  const { matrix } = useMatrix();

  const [inProgress, toggleProgress] = useToggle();

  const handleLogout = async () => {
    toggleProgress();
    try {
      await matrix.logout();
      onLogOut();
    } catch (error) {
      console.warn(error);
    }
    toggleProgress();
  };

  return (
    <div className="flex flex-col gap-y-2">
      <FootnoteText className="text-text-tertiary">{t('settings.matrix.userIdLabel')}</FootnoteText>
      <div className="flex items-center justify-between">
        <StatusMark className="row-span-2" variant="success" title={matrix.userId || ''} />
        <Button pallet="error" size="sm" disabled={inProgress} onClick={handleLogout}>
          {t('settings.matrix.logOutButton')}
        </Button>
      </div>
    </div>
  );
};

export default Credentials;
