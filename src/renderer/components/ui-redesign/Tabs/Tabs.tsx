import { Tab } from '@headlessui/react';
import { ReactNode } from 'react';

import cnTw from '@renderer/shared/utils/twMerge';
import { SmallTitleText } from '../Typography';

export interface TabItem {
  id: string;
  title: ReactNode;
  panel: ReactNode;
}
type Props = {
  items: TabItem[];
  panelClassName?: string;
  tabClassName?: string;
  onChange?: (index: number) => void;
};
const Tabs = ({ items, tabClassName, panelClassName = 'mt-4', onChange }: Props) => {
  return (
    <Tab.Group onChange={onChange}>
      <Tab.List className="p-0.5 flex bg-tab-background rounded-md gap-x-1">
        {items.map(({ id, title }) => (
          <Tab
            key={id}
            className={cnTw(
              'w-full py-1.5 px-2 rounded bg-inherit ui-selected:shadow-card-shadow ui-selected:bg-white flex items-center justify-center',
              tabClassName,
            )}
          >
            <SmallTitleText
              fontWeight="semibold"
              className="text-text-secondary ui-selected:text-text-primary flex items-center"
              align="center"
            >
              {title}
            </SmallTitleText>
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
