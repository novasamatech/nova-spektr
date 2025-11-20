import { memo } from 'react';

import { createPipeline, createSlot, usePipeline, useSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { Button, Icon } from '@/shared/ui';
import { Dropdown } from '@/shared/ui-kit';

import { NavItem, type Props as NavItemProps } from './NavItem';

// TODO refactor to slots
export const navigationTopLinksPipeline = createPipeline<NavItemProps[]>({
  postprocess: (items) => {
    return items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  },
});
export const navigationBottomLinksSlot = createSlot();
export const navigationActionsSlot = createSlot();

export const Navigation = memo(() => {
  const { t } = useI18n();
  const [isActionsOpen, toggleIsActionsOpen] = useToggle();

  const upperItems = usePipeline(navigationTopLinksPipeline, []);
  const lowerItems = useSlot(navigationBottomLinksSlot);
  const actions = useSlot(navigationActionsSlot);

  return (
    <nav className="h-full overflow-y-auto">
      <div className="flex h-full flex-col gap-2">
        {upperItems.map(({ icon, title, link, badge }) => (
          <NavItem key={link} icon={icon} title={title} link={link} badge={badge} />
        ))}

        <Dropdown width="trigger" align="center" keepOpen open={isActionsOpen} onToggle={toggleIsActionsOpen}>
          <Dropdown.Trigger>
            <Button
              pallet="secondary"
              size="sm"
              className="justify-center"
              suffixElement={<Icon name={isActionsOpen ? 'up' : 'down'} size={16} className="text-inherit" />}
            >
              {t('navigation.customOperationLabel')}
            </Button>
          </Dropdown.Trigger>
          <Dropdown.Content>{actions}</Dropdown.Content>
        </Dropdown>

        <div className="mt-auto flex flex-col gap-2">{lowerItems}</div>
      </div>
    </nav>
  );
});
