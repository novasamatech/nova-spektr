import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { FootnoteText, Icon } from '@/shared/ui';
import { authModel, backendConfigurationModel } from '@/aggregates/backend';

import { AuthStatus } from './AuthStatus';

export const BackendConnectionCard = () => {
  const { t } = useI18n();

  const [hasBackend, isAuthenticated, isSessionExpired, hasNetworkIssue] = useUnit([
    backendConfigurationModel.$hasBackend,
    authModel.$isAuthenticated,
    authModel.$isSessionExpired,
    authModel.$hasNetworkIssue,
  ]);

  if (!hasBackend) return null;

  const isWarning = !isAuthenticated || isSessionExpired || hasNetworkIssue;

  return (
    <button
      type="button"
      className={cnTw(
        'flex h-full cursor-pointer items-center gap-x-1 rounded-md border bg-input-background px-2.5 hover:bg-hover',
        isWarning ? 'border-text-warning' : 'border-filter-border',
      )}
      onClick={() => backendConfigurationModel.events.editStarted()}
    >
      <Icon
        name="globe"
        size={16}
        className={cnTw(
          'shrink-0',
          isSessionExpired || hasNetworkIssue
            ? 'text-text-warning'
            : isAuthenticated
              ? 'text-icon-positive'
              : 'text-icon-accent',
        )}
      />
      <FootnoteText>{t('addressBook.sources.externalSource')}</FootnoteText>
      <AuthStatus />
    </button>
  );
};
