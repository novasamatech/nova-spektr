import { useI18n } from '@/shared/i18n';
import { Button, Icon } from '@/shared/ui';
import { backendConfigurationModel } from '../model/backend-configuration-model';

export const BackendConfigurationButton = () => {
  const { t } = useI18n();

  return (
    <Button
      size="sm"
      prefixElement={<Icon name="globe" size={16} className="text-inherit" />}
      onClick={() => backendConfigurationModel.events.modalOpened()}
    >
      {t('addressBook.backendConfiguration.buttonLabel')}
    </Button>
  );
};
