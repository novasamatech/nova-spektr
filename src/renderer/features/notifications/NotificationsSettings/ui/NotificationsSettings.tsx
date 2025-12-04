import { useUnit } from 'effector-react';
import { memo, useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { FootnoteText, IconButton, MultiSelect, SmallTitleText, Switch } from '@/shared/ui';
import { WalletIcon } from '@/shared/ui-entities';
import { Box, Popover } from '@/shared/ui-kit';
import { walletModel } from '@/entities/wallet';
import { NotificationEvent } from '../lib/constants';
import { notificationsSettingsModel } from '../model/notifications-settings-model';

export const NotificationsSettings = memo(() => {
  const { t } = useI18n();

  const wallets = useUnit(walletModel.$allWallets);
  const selectedWalletIds = useUnit(notificationsSettingsModel.$selectedWalletIds);
  const notificationEvents = useUnit(notificationsSettingsModel.$notificationEvents);

  const walletOptions = useMemo(
    () =>
      wallets.map((wallet) => ({
        id: String(wallet.id),
        value: wallet,
        element: (
          <div className="flex items-center gap-x-1.5">
            <WalletIcon type={wallet.type} size={18} />
            <span className="text-xs leading-[18px] font-medium tracking-[-0.12px]">{wallet.name}</span>
          </div>
        ),
      })),
    [wallets],
  );

  const selectedWalletIdStrings = useMemo(() => Array.from(selectedWalletIds).map(String), [selectedWalletIds]);

  const hasActiveFilters =
    selectedWalletIds.size < wallets.length || notificationEvents.size < Object.keys(NotificationEvent).length;

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
        <div className="min-h-[350px]">
          <Box width="270px" padding={4} gap={3}>
            <SmallTitleText>{t('notifications.settings.showNotificationsFrom')}</SmallTitleText>
            <div className="relative z-10">
              <MultiSelect
                placeholder={t('notifications.settings.wallets')}
                selectedIds={selectedWalletIdStrings}
                options={walletOptions}
                position="auto"
                onChange={(selectedOptions) => {
                  const selectedIds = selectedOptions.map((opt) => Number(opt.id));
                  notificationsSettingsModel.events.selectedWalletsChanged(selectedIds);
                }}
              />
            </div>

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
                  <FootnoteText className="font-medium">
                    {t('notifications.settings.eventOperationCreated')}
                  </FootnoteText>
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
        </div>
      </Popover.Content>
    </Popover>
  );
});
