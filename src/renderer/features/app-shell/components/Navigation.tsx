import { memo } from 'react';

import { createPipeline, createSlot, usePipeline, useSlot } from '@/shared/di';

import { NavItem, type Props as NavItemProps } from './NavItem';

export const navigationTopLinksPipeline = createPipeline<NavItemProps[]>({
  postprocess: (items) => {
    return items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  },
});
export const navigationBottomLinksSlot = createSlot();

export const Navigation = memo(() => {
  const upperItems = usePipeline(navigationTopLinksPipeline, []);
  const lowerItems = useSlot(navigationBottomLinksSlot);

  return (
    <nav className="h-full overflow-y-auto">
      <div className="flex h-full flex-col gap-2">
        {upperItems.map(({ icon, title, link, badge }) => (
          <NavItem key={link} icon={icon} title={title} link={link} badge={badge} />
        ))}

        <div className="mt-auto flex flex-col gap-2">{lowerItems}</div>
      </div>
    </nav>
  );
});
