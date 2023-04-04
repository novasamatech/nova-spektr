import { Tab } from '@headlessui/react';
import { ReactNode } from 'react';
import cn from 'classnames';

import SmallTitle from '@renderer/components/ui-redesign/Typography/components/SmallTitle';

export interface TabItem {
  id: string;
  title: ReactNode;
  panel: ReactNode;
}
interface Props {
  items: TabItem[];
  panelClassName?: string;
  tabClassName?: string;
}
const Tabs = ({ items, tabClassName, panelClassName = 'mt-4' }: Props) => {
  return (
    <Tab.Group>
      <Tab.List className="p-0.5 flex bg-redesign-shade-5 border-redesign-shade-8 rounded-[5px] gap-1">
        {items.map(({ id, title }) => (
          <Tab
            key={id}
            className={cn(
              'w-full py-1 px-2 rounded text-redesign-shade-32 ui-selected:shadow-tab ui-selected:text-shade-100 ui-selected:bg-white uppercase flex items-center justify-center',
              tabClassName,
            )}
          >
            <SmallTitle fontWeight="semibold" className="w-full" align="center">
              {title}
            </SmallTitle>
          </Tab>
        ))}
      </Tab.List>
      <Tab.Panels>
        {items.map(({ id, panel }) => (
          <Tab.Panel key={id} className={panelClassName}>
            {panel}
          </Tab.Panel>
        ))}
      </Tab.Panels>
    </Tab.Group>
  );
};

export default Tabs;
