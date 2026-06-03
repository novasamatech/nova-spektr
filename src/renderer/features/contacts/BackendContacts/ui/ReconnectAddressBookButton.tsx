import { useI18n } from '@/shared/i18n';
import { Button, Icon } from '@/shared/ui';
import { Tooltip } from '@/shared/ui-kit';
import { backendConfigurationModel } from '@/aggregates/backend';

type Props = {
  className?: string;
  iconSize?: 14 | 16;
  label?: string;
  size?: 'sm' | 'md';
  variant?: 'fill' | 'chip' | 'text';
};

export const ReconnectAddressBookButton = ({
  className,
  iconSize = 16,
  label,
  size = 'md',
  variant = 'chip',
}: Props) => {
  const { t } = useI18n();

  const handleClick = () => {
    backendConfigurationModel.events.editStarted();
  };

  const buttonLabel = label ?? t('operations.drafts.reconnectOverlayButton');

  return (
    <Tooltip>
      <Tooltip.Trigger>
        <div>
          <Button
            size={size}
            variant={variant}
            pallet="secondary"
            className={className}
            prefixElement={<Icon name="refresh" size={iconSize} className="text-tab-icon-inactive" />}
            onClick={handleClick}
          >
            {buttonLabel}
          </Button>
        </div>
      </Tooltip.Trigger>
      <Tooltip.Content>{t('addressBook.auth.reconnectTooltip')}</Tooltip.Content>
    </Tooltip>
  );
};
