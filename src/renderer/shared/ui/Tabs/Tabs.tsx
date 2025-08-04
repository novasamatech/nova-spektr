import { Tab } from '@headlessui/react';

import { cnTw } from '@/shared/lib/utils';
import { FootnoteText } from '../Typography';

import { type TabItem } from './common/types';

type Props = {
  items: TabItem[];
  initialIndex?: number;
  unmount?: boolean;
  panelClassName?: string;
  tabClassName?: string;
  tabsClassName?: string;
  onChange?: (index: number) => void;
};

/**
 * @deprecated Use `import { Tabs } from '@/shared/ui-kit' instead.`
 */
export const Tabs = ({
  items,
  initialIndex,
  unmount = true,
  tabClassName,
  tabsClassName,
  panelClassName = 'mt-4',
  onChange,
}: Props) => (
  <Tab.Group defaultIndex={initialIndex} onChange={onChange}>
    <Tab.List className={cnTw('flex gap-x-1 rounded-md bg-tab-background p-0.5', tabsClassName)}>
      {items.map(({ id, title }) => (
        <Tab
          key={id}
          className={cnTw(
            'flex w-full items-center justify-center rounded-sm bg-transparent px-2 py-1.5 ui-selected:bg-white ui-selected:shadow-card-shadow',
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
        <Tab.Panel tabIndex={-1} key={id} unmount={unmount}>
          {panel}
        </Tab.Panel>
      ))}
    </Tab.Panels>
  </Tab.Group>
);
