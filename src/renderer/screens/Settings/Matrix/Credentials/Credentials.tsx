import { useI18n } from '@renderer/context/I18nContext';
import { useMatrix } from '@renderer/context/MatrixContext';
import { Button } from '@renderer/components/ui';

const Credentials = () => {
  const { t } = useI18n();
  const { matrix } = useMatrix();

  const handleLogout = async () => {
    try {
      await matrix.logout();
    } catch (error) {
      console.warn(error);
    }
  };

  // TODO: simple placeholder for Logout
  return (
    <div className="flex justify-between">
      <p>{t('settings.matrix.formTitle')}</p>
      <Button variant="outline" pallet="primary" onClick={handleLogout}>
        {t('settings.matrix.signOutButton')}
      </Button>
    </div>
  );
};

export default Credentials;
