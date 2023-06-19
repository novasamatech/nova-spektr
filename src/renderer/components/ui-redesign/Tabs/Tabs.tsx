import { Tab } from '@headlessui/react';
import { ReactNode } from 'react';

import cnTw from '@renderer/shared/utils/twMerge';
import TextBase from '@renderer/components/ui-redesign/Typography/common/TextBase';

export interface TabItem {
  id: string | number;
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
              'w-full py-1.5 px-2 rounded bg-transparent ui-selected:shadow-card-shadow ui-selected:bg-white flex items-center justify-center',
              tabClassName,
            )}
          >
            <TextBase
              className="text-text-secondary ui-selected:text-text-primary flex items-center text-button-small"
              align="center"
            >
              {title}
            </TextBase>
          </Tab>
        ))}
      </Tab.List>
      <Tab.Panels className={panelClassName}>
        {items.map(({ id, panel }) => (
          <Tab.Panel key={id}>{panel}</Tab.Panel>
        ))}
      </Tab.Panels>
    </Tab.Group>
  );
};

export default Tabs;
