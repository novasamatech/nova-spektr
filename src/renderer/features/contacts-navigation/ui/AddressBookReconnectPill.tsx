import { useUnit } from 'effector-react';
import { type MouseEvent } from 'react';

import { useI18n } from '@/shared/i18n';
import { Icon } from '@/shared/ui';
import { Tooltip } from '@/shared/ui-kit';
import { backendConfigurationModel } from '@/aggregates/backend';
import { backendContactsModel } from '@/features/contacts';
import { connectionStatusModel } from '../model/connection-status-model';

export const AddressBookReconnectPill = () => {
  const { t } = useI18n();

  const [featureEnabled, hasEverConnected, isHealthy, hasAuthIssue] = useUnit([
    connectionStatusModel.$featureEnabled,
    connectionStatusModel.$hasEverConnected,
    backendContactsModel.$isHealthy,
    backendContactsModel.$hasAuthIssue,
  ]);

  if (!featureEnabled || !hasEverConnected || isHealthy) return null;

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (hasAuthIssue) {
      backendConfigurationModel.events.editStarted();
    } else {
      backendContactsModel.events.syncTriggered();
    }
  };

  const label = t('addressBook.auth.reconnectButton');
  const tooltipText = t('addressBook.auth.reconnectTooltip');

  return (
    <Tooltip>
      <Tooltip.Trigger>
        <button
          type="button"
          aria-label={label}
          className="flex h-6 w-6 items-center justify-center rounded-md text-tab-icon-inactive transition-colors hover:bg-hover"
          onClick={handleClick}
        >
          <Icon name="refresh" size={14} className="text-inherit" />
        </button>
      </Tooltip.Trigger>
      <Tooltip.Content>{tooltipText}</Tooltip.Content>
    </Tooltip>
  );
};
