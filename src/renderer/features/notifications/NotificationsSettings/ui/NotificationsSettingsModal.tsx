import { useUnit } from 'effector-react';
import { useEffect, useMemo, useState } from 'react';

import { NotificationEvent } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import {
  BodyText,
  Button,
  FootnoteText,
  HelpText,
  Icon,
  IconButton,
  MultiSelect,
  Plate,
  SmallTitleText,
  Switch,
} from '@/shared/ui';
import { WalletIcon } from '@/shared/ui-entities';
import { Modal } from '@/shared/ui-kit';
import { walletModel } from '@/entities/wallet';
import { notificationsSettingsModel } from '../model/notifications-settings-model';

const EVENT_OPTIONS = [
  { event: NotificationEvent.WALLET_CREATED, labelKey: 'eventWalletCreated' },
  { event: NotificationEvent.OPERATION_CREATED, labelKey: 'eventOperationCreated' },
  { event: NotificationEvent.OPERATION_EXECUTED, labelKey: 'eventOperationExecuted' },
  { event: NotificationEvent.OPERATION_REJECTED, labelKey: 'eventOperationRejected' },
] as const;

type Props = {
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
  showTrigger?: boolean;
};

export const NotificationsSettingsModal = ({ isOpen: controlledIsOpen, onToggle, showTrigger = true }: Props) => {
  const { t } = useI18n();

  const wallets = useUnit(walletModel.$allWallets);
  const savedDisabledWalletIds = useUnit(notificationsSettingsModel.$disabledWalletIds);
  const savedNotificationEvents = useUnit(notificationsSettingsModel.$notificationEvents);
  const savedSoundEnabled = useUnit(notificationsSettingsModel.$soundEnabled);

  const [disabledWalletIds, setDisabledWalletIds] = useState(() => savedDisabledWalletIds);
  const [enabledEvents, setEnabledEvents] = useState(() => savedNotificationEvents);
  const [soundEnabled, setSoundEnabled] = useState(() => savedSoundEnabled);
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;
  const setIsOpen = isControlled ? onToggle! : setInternalIsOpen;

  // Selected wallet IDs for MultiSelect (enabled = not disabled)
  const selectedWalletIds = useMemo(
    () => new Set(wallets.filter((w) => !disabledWalletIds.has(w.id)).map((w) => w.id)),
    [wallets, disabledWalletIds],
  );

  useEffect(() => {
    if (isOpen) {
      setDisabledWalletIds(savedDisabledWalletIds);
      setEnabledEvents(savedNotificationEvents);
      setSoundEnabled(savedSoundEnabled);
    }
  }, [isOpen, savedDisabledWalletIds, savedNotificationEvents, savedSoundEnabled]);

  const walletOptions = useMemo(
    () =>
      wallets.map((wallet) => ({
        id: String(wallet.id),
        value: wallet,
        element: (
          <div className="flex items-center gap-x-1.5">
            <WalletIcon type={wallet.type} size={18} />
            <span className="text-footnote">{wallet.name}</span>
          </div>
        ),
      })),
    [wallets],
  );

  const toggleEvent = (event: NotificationEvent) => {
    setEnabledEvents((prev) => {
      const next = new Set(prev);
      next.has(event) ? next.delete(event) : next.add(event);

      return next;
    });
  };

  const handleWalletChange = (options: { id: string }[]) => {
    const enabledIds = new Set(options.map((opt) => Number(opt.id)));
    setDisabledWalletIds(new Set(wallets.filter((w) => !enabledIds.has(w.id)).map((w) => w.id)));
  };

  const handleSave = () => {
    notificationsSettingsModel.events.settingsSaved({
      disabledWalletIds: [...disabledWalletIds],
      notificationEvents: [...enabledEvents],
      soundEnabled,
    });
    setIsOpen(false);
  };

  const handlePlaySound = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    notificationsSettingsModel.events.soundPlayed();
  };

  return (
    <Modal size="md" isOpen={isOpen} onToggle={setIsOpen}>
      {showTrigger && (
        <Modal.Trigger>
          <Plate className="p-0">
            <button className="flex w-full cursor-pointer items-center gap-x-2 rounded-md p-3 transition hover:shadow-card-shadow focus:shadow-card-shadow">
              <Icon className="row-span-2" name="notification" size={36} />
              <BodyText>{t('settings.notificationsSettings.plateTitle')}</BodyText>
            </button>
          </Plate>
        </Modal.Trigger>
      )}

      <Modal.Title close>{t('settings.notificationsSettings.modalTitle')}</Modal.Title>

      <Modal.Content>
        <hr className="border-divider" />
        <div className="flex flex-col gap-y-4 px-5 py-4">
          <div className="flex flex-col gap-y-2">
            <SmallTitleText className="text-text-primary">{t('settings.notificationsSettings.general')}</SmallTitleText>
            <Switch
              checked={soundEnabled}
              labelPosition="left"
              variant="accent"
              className="gap-x-2"
              onChange={() => setSoundEnabled(!soundEnabled)}
            >
              <div className="flex items-center gap-x-1">
                <FootnoteText className="text-text-primary">
                  {t('settings.notificationsSettings.soundEnabled')}
                </FootnoteText>
                <IconButton name="volume" size={16} className="p-0 pl-1" onClick={handlePlaySound} />
              </div>
            </Switch>
          </div>
        </div>

        <hr className="border-divider" />

        <div className="flex flex-col gap-y-4 px-5 py-4">
          <div className="flex flex-col gap-y-4">
            <div className="flex flex-col gap-y-2">
              <SmallTitleText className="text-text-primary">
                {t('settings.notificationsSettings.preferences')}
              </SmallTitleText>
              <HelpText className="text-text-secondary">
                {t('settings.notificationsSettings.preferencesDescription')}
              </HelpText>
            </div>
            <MultiSelect
              placeholder={t('settings.notificationsSettings.walletsPlaceholder')}
              multiPlaceholder={t('settings.notificationsSettings.walletsMultiPlaceholder')}
              selectedIds={[...selectedWalletIds].map(String)}
              options={walletOptions}
              onChange={handleWalletChange}
            />
          </div>

          <div className="flex flex-col gap-y-3">
            {EVENT_OPTIONS.map(({ event, labelKey }) => (
              <Switch
                key={event}
                checked={enabledEvents.has(event)}
                labelPosition="left"
                variant="accent"
                className="gap-x-2"
                onChange={() => toggleEvent(event)}
              >
                <FootnoteText className="text-text-primary">
                  {t(`settings.notificationsSettings.${labelKey}`)}
                </FootnoteText>
              </Switch>
            ))}
          </div>
        </div>
      </Modal.Content>

      <Modal.Footer>
        <Button className="ml-auto" onClick={handleSave}>
          {t('settings.notificationsSettings.saveButton')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
