import { useUnit } from 'effector-react';

import { createSlot, useSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { cnTw } from '@/shared/lib/utils';
import { BodyText, Icon } from '@/shared/ui';
import { Dropdown, Tooltip } from '@/shared/ui-kit';
import { sidebarModel } from '@/features/app-shell';

export const customOperationsSlot = createSlot();

export const CustomOperations = () => {
  const { t } = useI18n();
  const [isActionsOpen, toggleIsActionsOpen] = useToggle();
  const folded = useUnit(sidebarModel.$folded);

  const customOperations = useSlot(customOperationsSlot);

  return (
    <Tooltip side="right" open={folded && !isActionsOpen ? undefined : false}>
      <Tooltip.Trigger>
        <div>
          <Dropdown
            width={folded ? 'auto' : 'trigger'}
            align={folded ? 'start' : 'center'}
            side={folded ? 'right' : 'bottom'}
            keepOpen
            open={isActionsOpen}
            onToggle={toggleIsActionsOpen}
          >
            <Dropdown.Trigger>
              <button
                type="button"
                className="flex w-full cursor-pointer items-center rounded-md px-3.5 py-2.5 text-tab-icon-inactive outline-offset-reduced transition-all duration-200 select-none hover:bg-tab-background"
              >
                <Icon name="magic" size={20} className="shrink-0 text-inherit" />
                <BodyText
                  className={cnTw(
                    'overflow-hidden whitespace-nowrap text-text-secondary transition-all duration-200',
                    folded ? 'ml-0 max-w-0 opacity-0' : 'ml-3 max-w-[180px] opacity-100',
                  )}
                >
                  {t('navigation.customOperationLabel')}
                </BodyText>
                <div
                  className={cnTw(
                    'ml-auto overflow-hidden transition-all duration-200',
                    folded ? 'max-w-0 opacity-0' : 'max-w-[20px] opacity-100',
                  )}
                >
                  <Icon name={isActionsOpen ? 'up' : 'down'} size={16} className="text-inherit" />
                </div>
              </button>
            </Dropdown.Trigger>
            <Dropdown.Content>{customOperations}</Dropdown.Content>
          </Dropdown>
        </div>
      </Tooltip.Trigger>
      <Tooltip.Content>{t('navigation.customOperationLabel')}</Tooltip.Content>
    </Tooltip>
  );
};
