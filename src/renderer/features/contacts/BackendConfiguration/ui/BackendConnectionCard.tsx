import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { FootnoteText, Icon } from '@/shared/ui';
import { authModel } from '../model/auth-model';
import { backendConfigurationModel } from '../model/backend-configuration-model';

import { AuthStatus } from './AuthStatus';

export const BackendConnectionCard = () => {
  const { t } = useI18n();

  const [hasBackend, isAuthenticated, isSessionExpired] = useUnit([
    backendConfigurationModel.$hasBackend,
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
      <FootnoteText>{t('addressBook.sources.externalSource')}</FootnoteText>
      <AuthStatus />
    </button>
  );
};
