import { memo } from 'react';

import { createPipeline, createSlot, usePipeline, useSlot } from '@/shared/di';

import { type Props as NavItemProps, NavItem } from './NavItem';

// TODO refactor to slots
export const navigationTopLinksPipeline = createPipeline<NavItemProps[]>({
  postprocess: (items) => {
    return items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  },
});
export const navigationBottomLinksSlot = createSlot();
export const navigationCustomOperationsSlot = createSlot();

export const Navigation = memo(() => {
  const upperItems = usePipeline(navigationTopLinksPipeline, []);
  const lowerItems = useSlot(navigationBottomLinksSlot);
  const customOperationItems = useSlot(navigationCustomOperationsSlot);

  return (
    <nav className="h-full overflow-y-auto">
      <div className="flex h-full flex-col gap-2">
        {upperItems.map(({ icon, title, link, badge }) => (
          <NavItem key={link} icon={icon} title={title} link={link} badge={badge} />
        ))}
        {customOperationItems}
        <div className="mt-auto flex flex-col gap-2">{lowerItems}</div>
      </div>
    </nav>
  );
});
