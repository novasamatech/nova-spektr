import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { Button, Icon } from '@/shared/ui';
import { Tooltip } from '@/shared/ui-kit';
import { authModel, backendConfigurationModel } from '@/aggregates/backend';
import { backendContactsModel } from '@/features/contacts';

type Props = {
  variant?: 'fill' | 'chip';
};

export const ReconnectAddressBookButton = ({ variant = 'chip' }: Props) => {
  const { t } = useI18n();
  const isAuthenticated = useUnit(authModel.$isAuthenticated);
  const isSessionExpired = useUnit(authModel.$isSessionExpired);
  const hasNetworkIssue = useUnit(authModel.$hasNetworkIssue);

  const isAuthIssue = !isAuthenticated || isSessionExpired || hasNetworkIssue;

  const handleClick = () => {
    if (isAuthIssue) {
      backendConfigurationModel.events.editStarted();
    } else {
      backendContactsModel.events.syncTriggered();
    }
  };

  return (
    <Tooltip>
      <Tooltip.Trigger>
        <div>
          <Button
            variant={variant}
            pallet="secondary"
            prefixElement={<Icon name="refresh" size={16} className="text-tab-icon-inactive" />}
            onClick={handleClick}
          >
            {t('operations.drafts.reconnectOverlayButton')}
          </Button>
        </div>
      </Tooltip.Trigger>
      <Tooltip.Content>{t('addressBook.auth.reconnectTooltip')}</Tooltip.Content>
    </Tooltip>
  );
};
