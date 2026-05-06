import { useUnit } from 'effector-react';
import { type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { useI18n } from '@/shared/i18n';
import { Paths } from '@/shared/routes';
import { Icon } from '@/shared/ui';
import { Tooltip } from '@/shared/ui-kit';
import { authModel, backendConfigurationModel } from '@/aggregates/backend';
import { backendContactsModel } from '@/features/contacts';
import { connectionStatusModel } from '../model/connection-status-model';

export const AddressBookReconnectPill = () => {
  const { t } = useI18n();
  const navigate = useNavigate();

  const [featureEnabled, hasEverConnected, hasBackend, isAuthenticated, isSessionExpired, hasNetworkIssue, syncStatus] =
    useUnit([
      connectionStatusModel.$featureEnabled,
      connectionStatusModel.$hasEverConnected,
      backendConfigurationModel.$hasBackend,
      authModel.$isAuthenticated,
      authModel.$isSessionExpired,
      authModel.$hasNetworkIssue,
      backendContactsModel.$syncStatus,
    ]);

  const isHealthy = isAuthenticated && !isSessionExpired && !hasNetworkIssue && syncStatus !== 'error';
  const isActionable = featureEnabled && hasEverConnected && hasBackend && !isHealthy;

  if (!isActionable) return null;

  const isAuthIssue = !isAuthenticated || isSessionExpired || hasNetworkIssue;

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    navigate(Paths.ADDRESS_BOOK);
    if (isAuthIssue) {
      backendConfigurationModel.events.editStarted();
    } else {
      backendContactsModel.events.syncTriggered();
    }
  };

  const label = t('addressBook.auth.reconnectButton');

  return (
    <Tooltip>
      <Tooltip.Trigger>
        <button
          type="button"
          aria-label={label}
          className="flex h-6 w-6 items-center justify-center rounded-md text-text-warning transition-colors hover:bg-badge-orange-background-default"
          onClick={handleClick}
        >
          <Icon name="refresh" size={14} className="text-inherit" />
        </button>
      </Tooltip.Trigger>
      <Tooltip.Content>{label}</Tooltip.Content>
    </Tooltip>
  );
};
