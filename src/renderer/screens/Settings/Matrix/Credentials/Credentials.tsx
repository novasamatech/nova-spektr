import { useI18n } from '@renderer/context/I18nContext';
import { useMatrix } from '@renderer/context/MatrixContext';
import { Block, Button, Icon } from '@renderer/components/ui';
import { useToggle } from '@renderer/shared/hooks';

const Credentials = () => {
  const { t } = useI18n();
  const { matrix } = useMatrix();

  const [inProgress, toggleProgress] = useToggle();

  const handleLogout = async () => {
    toggleProgress();
    try {
      await matrix.logout();
    } catch (error) {
      console.warn(error);
    }
    toggleProgress();
  };

  return (
    <Block>
      <h2 className="text-neutral text-xl font-semibold">{t('settings.matrix.formTitle')}</h2>
      <p className="text-neutral text-sm">{t('settings.matrix.formSubtitle')}</p>
      <div className="grid grid-flow-col grid-rows-2 justify-between mt-10">
        <p className="text-shade-30 font-bold text-2xs uppercase self-end">{t('settings.matrix.userIdLabel')}</p>
        <p className="text-success font-semibold text-sm">{matrix.userId}</p>
        <Button
          className="row-span-2 min-w-[90px]"
          variant="outline"
          pallet="primary"
          weight="lg"
          disabled={inProgress}
          onClick={handleLogout}
        >
          {inProgress ? <Icon className="animate-spin" name="loader" /> : t('settings.matrix.signOutButton')}
        </Button>
      </div>
    </Block>
  );
};

export default Credentials;
