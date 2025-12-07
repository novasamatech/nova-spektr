import { createSlot, useSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { Button, Icon } from '@/shared/ui';
import { Dropdown } from '@/shared/ui-kit';

export const customOperationsSlot = createSlot();

export const CustomOperations = () => {
  const { t } = useI18n();
  const [isActionsOpen, toggleIsActionsOpen] = useToggle();

  const customOperations = useSlot(customOperationsSlot);

  return (
    <div className="px-3.5">
      <Dropdown width="trigger" align="center" keepOpen open={isActionsOpen} onToggle={toggleIsActionsOpen}>
        <Dropdown.Trigger>
          <Button
            pallet="secondary"
            size="sm"
            className="w-full justify-center"
            suffixElement={<Icon name={isActionsOpen ? 'up' : 'down'} size={16} className="text-inherit" />}
          >
            {t('navigation.customOperationLabel')}
          </Button>
        </Dropdown.Trigger>
        <Dropdown.Content>{customOperations}</Dropdown.Content>
      </Dropdown>
    </div>
  );
};
