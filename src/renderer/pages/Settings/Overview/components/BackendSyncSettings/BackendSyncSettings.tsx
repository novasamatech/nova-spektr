import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { BodyText, Button, FootnoteText, Icon } from '@/shared/ui';
import { Plate } from '@/shared/ui';
import { authModel, backendConfigurationModel } from '@/features/contacts';

export const BackendSyncSettings = () => {
  const { t } = useI18n();

  const hasBackend = useUnit(backendConfigurationModel.$hasBackend);
  const isAuthenticated = useUnit(authModel.$isAuthenticated);

  const handleConfigure = () => {
    backendConfigurationModel.events.editStarted();
  };

  const handleAdd = () => {
    backendConfigurationModel.events.modalOpened();
  };

  return (
    <div className="flex flex-col gap-y-2">
      <FootnoteText className="text-text-tertiary">{t('settings.backendSync.title')}</FootnoteText>
      <Plate className="p-0">
        {hasBackend ? (
          <div className="flex w-full items-center gap-x-2 rounded-sm p-3">
            <Icon name="globe" size={36} />
            <div className="flex min-w-0 flex-1 flex-col">
              <BodyText className="truncate">{t('settings.backendSync.title')}</BodyText>
              <FootnoteText className={isAuthenticated ? 'text-icon-positive' : 'text-text-tertiary'}>
                {isAuthenticated ? t('settings.backendSync.connected') : t('settings.backendSync.disconnected')}
              </FootnoteText>
            </div>
            <Button variant="text" size="sm" onClick={handleConfigure}>
              {t('settings.backendSync.configureButton')}
            </Button>
          </div>
        ) : (
          <div className="flex w-full items-center gap-x-2 rounded-sm p-3">
            <Icon name="globe" size={36} />
            <BodyText className="flex-1 text-text-tertiary">{t('settings.backendSync.notConfigured')}</BodyText>
            <Button variant="text" size="sm" onClick={handleAdd}>
              {t('settings.backendSync.addButton')}
            </Button>
          </div>
        )}
      </Plate>
    </div>
  );
};
