import { useUnit } from 'effector-react';
import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { FootnoteText, IconButton, SmallTitleText, Switch } from '@/shared/ui';
import { Box, Popover, Select } from '@/shared/ui-kit';
import { NotificationEvent, NotificationSource } from '../lib/constants';
import { notificationsSettingsModel } from '../model/notifications-settings-model';

export const NotificationsSettings = memo(() => {
  const { t } = useI18n();

  const notificationSource = useUnit(notificationsSettingsModel.$notificationSource);
  const notificationEvents = useUnit(notificationsSettingsModel.$notificationEvents);

  const hasActiveFilters =
    notificationSource !== NotificationSource.ALL || notificationEvents.size < Object.keys(NotificationEvent).length;

  return (
    <Popover align="end">
      <Popover.Trigger>
        <div className="relative">
          <IconButton name="settingsLite" className="p-1.5" />
          {hasActiveFilters && (
            <span className="absolute top-0 right-0 h-1.5 w-1.5 rounded-full bg-icon-accent duration-100 animate-in fade-in" />
          )}
        </div>
      </Popover.Trigger>
      <Popover.Content>
        <Box width="270px" padding={4} gap={3}>
          <SmallTitleText>{t('notifications.settings.source')}</SmallTitleText>
          <Select
            placeholder={t('notifications.settings.sourcePlaceholder')}
            value={notificationSource}
            onChange={(value) =>
              notificationsSettingsModel.events.notificationSourceChanged(value as NotificationSource)
            }
          >
            <Select.Item value={NotificationSource.ALL}>
              <FootnoteText>{t('notifications.settings.sourceAll')}</FootnoteText>
            </Select.Item>
            <Select.Item value={NotificationSource.OPERATIONS}>
              <FootnoteText>{t('notifications.settings.sourceOperations')}</FootnoteText>
            </Select.Item>
            <Select.Item value={NotificationSource.WALLETS}>
              <FootnoteText>{t('notifications.settings.sourceWallets')}</FootnoteText>
            </Select.Item>
          </Select>

          <hr className="-mx-4 border-divider" />

          <Box gap={3}>
            <SmallTitleText>{t('notifications.settings.events')}</SmallTitleText>
            <Box gap={3}>
              <Switch
                checked={notificationEvents.has(NotificationEvent.WALLET_CREATED)}
                labelPosition="left"
                variant="accent"
                className="gap-x-2"
                onChange={() =>
                  notificationsSettingsModel.events.notificationEventToggled(NotificationEvent.WALLET_CREATED)
                }
              >
                <FootnoteText className="font-medium">{t('notifications.settings.eventWalletCreated')}</FootnoteText>
              </Switch>
              <Switch
                checked={notificationEvents.has(NotificationEvent.OPERATION_CREATED)}
                labelPosition="left"
                variant="accent"
                className="gap-x-2"
                onChange={() =>
                  notificationsSettingsModel.events.notificationEventToggled(NotificationEvent.OPERATION_CREATED)
                }
              >
                <FootnoteText className="font-medium">{t('notifications.settings.eventOperationCreated')}</FootnoteText>
              </Switch>
              <Switch
                checked={notificationEvents.has(NotificationEvent.OPERATION_EXECUTED)}
                labelPosition="left"
                variant="accent"
                className="gap-x-2"
                onChange={() =>
                  notificationsSettingsModel.events.notificationEventToggled(NotificationEvent.OPERATION_EXECUTED)
                }
              >
                <FootnoteText className="font-medium">
                  {t('notifications.settings.eventOperationExecuted')}
                </FootnoteText>
              </Switch>
              <Switch
                checked={notificationEvents.has(NotificationEvent.OPERATION_REJECTED)}
                labelPosition="left"
                variant="accent"
                className="gap-x-2"
                onChange={() =>
                  notificationsSettingsModel.events.notificationEventToggled(NotificationEvent.OPERATION_REJECTED)
                }
              >
                <FootnoteText className="font-medium">
                  {t('notifications.settings.eventOperationRejected')}
                </FootnoteText>
              </Switch>
            </Box>
          </Box>
        </Box>
      </Popover.Content>
    </Popover>
  );
});
