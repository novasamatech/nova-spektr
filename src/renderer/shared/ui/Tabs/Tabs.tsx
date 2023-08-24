import { Tab } from '@headlessui/react';

import { cnTw } from '@renderer/shared/lib/utils';
import { BodyText } from '../Typography';
import { TabItem } from './common/types';

type Props = {
  items: TabItem[];
  unmount?: boolean;
  panelClassName?: string;
  tabClassName?: string;
  onChange?: (index: number) => void;
};

export const Tabs = ({ items, unmount = true, tabClassName, panelClassName = 'mt-4', onChange }: Props) => (
  <Tab.Group onChange={onChange}>
    <Tab.List className="p-0.5 flex bg-button-secondary-default rounded-md gap-x-1">
      {items.map(({ id, title, subTitle }) => (
        <Tab
          key={id}
          className={cnTw(
            'w-full py-1.5 px-3 rounded flex items-center justify-center gap-1.5 outline-offset-1',
            'bg-button-secondary-default hover:bg-button-secondary-hover active:bg-button-secondary-active',
            'ui-selected:shadow-shadow-primary ui-selected:bg-bg-primary-default',
            tabClassName,
          )}
        >
          <BodyText
            fontWeight="semibold"
            className="text-text-secondary active:text-text-primary ui-selected:text-text-primary"
          >
            {title}
          </BodyText>
          {subTitle && (
            <BodyText fontWeight="semibold" className=" text-text-tertiary">
              {subTitle}
            </BodyText>
          )}
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
