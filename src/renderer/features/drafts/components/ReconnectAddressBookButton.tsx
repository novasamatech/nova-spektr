import { useI18n } from '@/shared/i18n';
import { Button, Icon } from '@/shared/ui';
import { Tooltip } from '@/shared/ui-kit';
import { backendConfigurationModel } from '@/aggregates/backend';

type Props = {
  variant?: 'fill' | 'chip';
};

export const ReconnectAddressBookButton = ({ variant = 'chip' }: Props) => {
  const { t } = useI18n();

  const handleClick = () => {
    backendConfigurationModel.events.editStarted();
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
