import { useUnit } from 'effector-react';

import { cnTw } from '@/shared/lib/utils';
import { FootnoteText, Icon } from '@/shared/ui';
import { Tooltip } from '@/shared/ui-kit';
import { authModel } from '../model/auth-model';
import { backendConfigurationModel } from '../model/backend-configuration-model';

import { AuthStatus } from './AuthStatus';

export const BackendConnectionCard = () => {
  const [hasBackend, backendUrl, isAuthenticated, isSessionExpired] = useUnit([
    backendConfigurationModel.$hasBackend,
    backendConfigurationModel.$backendUrl,
    authModel.$isAuthenticated,
    authModel.$isSessionExpired,
  ]);

  if (!hasBackend) return null;

  const isDisconnected = !isAuthenticated || isSessionExpired;

  return (
    <button
      type="button"
      className={cnTw(
        'flex h-full cursor-pointer items-center gap-x-1 rounded-md border bg-input-background px-2.5 hover:bg-hover',
        isDisconnected ? 'border-text-warning' : 'border-filter-border',
      )}
      onClick={() => backendConfigurationModel.events.editStarted()}
    >
      <Icon
        name="globe"
        size={16}
        className={cnTw(
          'shrink-0',
          isSessionExpired ? 'text-text-warning' : isAuthenticated ? 'text-icon-positive' : 'text-icon-accent',
        )}
      />
      <Tooltip enableHover delay={200}>
        <Tooltip.Trigger>
          <FootnoteText className="max-w-[140px] truncate">{backendUrl}</FootnoteText>
        </Tooltip.Trigger>
        <Tooltip.Content>{backendUrl}</Tooltip.Content>
      </Tooltip>
      <AuthStatus />
    </button>
  );
};
