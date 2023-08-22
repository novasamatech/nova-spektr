import type { Meta, StoryObj } from '@storybook/react';

import { Tabs } from './Tabs';
import { TabItem } from './common/types';

const meta: Meta<typeof Tabs> = {
  title: 'ui/Tabs',
  component: Tabs,
};

const tabItems: TabItem[] = [
  { id: '1', title: 'Tab 1 title', panel: <div>tab 1 content</div> },
  { id: '2', title: 'Tab 2 title', panel: <div>tab 2 content</div> },
  { id: '3', title: 'Tab 3 title', panel: <div>tab 3 content</div> },
];

export default meta;
type Story = StoryObj<typeof Tabs>;

export const Primary: Story = {
  args: {
    items: tabItems,
  },
};
