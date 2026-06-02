import { useI18n } from '@/shared/i18n';
import { Button, Icon } from '@/shared/ui';
import { Tooltip } from '@/shared/ui-kit';
import { backendConfigurationModel } from '@/aggregates/backend';

export const OperationDescriptionReconnect = () => {
  const { t } = useI18n();

  const handleReconnect = () => {
    backendConfigurationModel.events.editStarted();
  };

  return (
    <Tooltip>
      <Tooltip.Trigger>
        <div>
          <Button
            size="sm"
            variant="text"
            className="shrink-0 gap-x-1 p-0"
            prefixElement={<Icon name="refresh" size={14} className="text-tab-icon-inactive" />}
            onClick={handleReconnect}
          >
            {t('addressBook.auth.reconnectButton')}
          </Button>
        </div>
      </Tooltip.Trigger>
      <Tooltip.Content>{t('addressBook.auth.reconnectTooltip')}</Tooltip.Content>
    </Tooltip>
  );
};
