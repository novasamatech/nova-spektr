import { useI18n } from '@renderer/context/I18nContext';
import { useMatrix } from '@renderer/context/MatrixContext';
import { useToggle } from '@renderer/shared/hooks';
import { Button, FootnoteText, StatusLabel } from '@renderer/components/ui-redesign';

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
        <StatusLabel className="row-span-2" variant="success" title={matrix.userId || ''} />
        <Button pallet="error" size="sm" disabled={inProgress} onClick={handleLogout}>
          {t('settings.matrix.logOutButton')}
        </Button>
      </div>
    </div>
  );
};

export default Credentials;
