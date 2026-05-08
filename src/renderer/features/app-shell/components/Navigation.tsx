import { useUnit } from 'effector-react';
import { memo } from 'react';

import { createPipeline, createSlot, usePipeline, useSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { BodyText, Icon } from '@/shared/ui';
import { Tooltip } from '@/shared/ui-kit';
import { sidebarModel } from '../model/sidebar-model';

import { type Props as NavItemProps, NavItem } from './NavItem';

// TODO refactor to slots
export const navigationTopLinksPipeline = createPipeline<NavItemProps[]>({
  postprocess: (items) => {
    return items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  },
});
export const navigationBottomLinksSlot = createSlot();
export const navigationCustomOperationsSlot = createSlot<{ folded: boolean }>();

export const Navigation = memo(() => {
  const upperItems = usePipeline(navigationTopLinksPipeline, []);
  const lowerItems = useSlot(navigationBottomLinksSlot);
  const folded = useUnit(sidebarModel.$folded);
  const customOperationItems = useSlot(navigationCustomOperationsSlot, { props: { folded } });

  return (
    <nav className="h-full overflow-x-hidden overflow-y-auto">
      <div className="flex h-full flex-col gap-2">
        {upperItems.map(({ icon, title, link, badge, iconBadge, trailingAction }) => (
          <NavItem
            key={link}
            icon={icon}
            title={title}
            link={link}
            badge={badge}
            iconBadge={iconBadge}
            trailingAction={trailingAction}
          />
        ))}
        {customOperationItems}
        <div className="mt-auto flex flex-col gap-2">
          {lowerItems}
          <ToggleButton folded={folded} />
        </div>
      </div>
    </nav>
  );
});

const ToggleButton = memo(({ folded }: { folded: boolean }) => {
  const { t } = useI18n();

  return (
    <Tooltip side="right" open={folded ? undefined : false}>
      <Tooltip.Trigger>
        <div>
          <button
            type="button"
            className="flex w-full cursor-pointer items-center rounded-md px-3.5 py-2.5 text-tab-icon-inactive outline-offset-reduced transition-all duration-200 select-none hover:bg-tab-background"
            onClick={() => sidebarModel.toggled()}
          >
            <Icon name={folded ? 'right' : 'left'} size={20} className="shrink-0 transition-transform duration-200" />
            <BodyText
              className={cnTw(
                'overflow-hidden whitespace-nowrap text-text-secondary transition-all duration-200',
                folded ? 'ml-0 max-w-0 opacity-0' : 'ml-3 max-w-[180px] opacity-100',
              )}
            >
              {t('navigation.collapseLabel')}
            </BodyText>
          </button>
        </div>
      </Tooltip.Trigger>
      <Tooltip.Content>{t('navigation.collapseLabel')}</Tooltip.Content>
    </Tooltip>
  );
});
