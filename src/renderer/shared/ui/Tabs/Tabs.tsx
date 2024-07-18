import { Tab } from '@headlessui/react';

import { cnTw } from '@shared/lib/utils';
import { FootnoteText } from '@shared/ui';

import { type TabItem } from './common/types';

type Props = {
  items: TabItem[];
  unmount?: boolean;
  panelClassName?: string;
  tabClassName?: string;
  tabsClassName?: string;
  onChange?: (index: number) => void;
};

export const Tabs = ({
  items,
  unmount = true,
  tabClassName,
  tabsClassName,
  panelClassName = 'mt-4',
  onChange,
}: Props) => (
  <Tab.Group onChange={onChange}>
    <Tab.List className={cnTw('p-0.5 flex bg-tab-background rounded-md gap-x-1', tabsClassName)}>
      {items.map(({ id, title }) => (
        <Tab
          key={id}
          className={cnTw(
            'w-full py-1.5 px-2 rounded bg-transparent ui-selected:shadow-card-shadow ui-selected:bg-white flex items-center justify-center',
            tabClassName,
          )}
        >
          <FootnoteText
            align="center"
            className="flex items-center text-button-small text-text-secondary ui-selected:text-text-primary"
          >
            {title}
          </FootnoteText>
        </Tab>
      ))}
    </Tab.List>
    <Tab.Panels className={panelClassName}>
      {items.map(({ id, panel }) => (
        <Tab.Panel key={id} unmount={unmount}>
          {panel}
        </Tab.Panel>
      ))}
    </Tab.Panels>
  </Tab.Group>
);
