import { type Meta, type StoryFn } from '@storybook/react';

import { Tabs } from './Tabs';
import { type TabItem } from './common/types';

export default {
  title: 'v1/ui/Tabs',
  component: Tabs,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as Meta<typeof Tabs>;

const tabItems: TabItem[] = [
  { id: '1', title: 'Tab 1 title', panel: <div>tab 1 content</div> },
  { id: '2', title: 'Tab 2 title', panel: <div>tab 2 content</div> },
  { id: '3', title: 'Tab 3 title', panel: <div>tab 3 content</div> },
];

const Template: StoryFn<typeof Tabs> = (args) => <Tabs {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  items: tabItems,
};
