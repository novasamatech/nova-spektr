import { useUnit } from 'effector-react';

import { cnTw } from '@/shared/lib/utils';
import { authModel } from '@/aggregates/backend';
import { backendContactsModel } from '@/features/contacts';
import { connectionStatusModel } from '../model/connection-status-model';

export const AddressBookStatusDot = () => {
  const [featureEnabled, hasEverConnected, isAuthenticated, isSessionExpired, hasNetworkIssue, syncStatus] = useUnit([
    connectionStatusModel.$featureEnabled,
    connectionStatusModel.$hasEverConnected,
    authModel.$isAuthenticated,
    authModel.$isSessionExpired,
    authModel.$hasNetworkIssue,
    backendContactsModel.$syncStatus,
  ]);

  if (!featureEnabled || !hasEverConnected) return null;

  const isWarning = isSessionExpired || hasNetworkIssue || syncStatus === 'error';
  const isConnected = isAuthenticated && !isWarning;

  const dotClass = isWarning ? 'bg-icon-warning' : isConnected ? 'bg-icon-positive' : 'bg-icon-default';

  return (
    <span
      className={cnTw(
        'pointer-events-none absolute -top-0.5 -right-1 h-1.5 w-1.5 rounded-full ring-2 ring-left-navigation-menu-background',
        dotClass,
      )}
    />
  );
};
