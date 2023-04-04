import { ComponentMeta, ComponentStory } from '@storybook/react';

import Tabs, { TabItem } from '@renderer/components/ui-redesign/Tabs/Tabs';

export default {
  title: 'Redesign/Tabs',
  component: Tabs,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof Tabs>;

const tabItems: TabItem[] = [
  { id: '1', title: 'Tab 1', panel: <div>tab 1 content</div> },
  { id: '2', title: 'Tab 2', panel: <div>tab 2 content</div> },
  { id: '3', title: 'Tab 3', panel: <div>tab 3 content</div> },
];

const Template: ComponentStory<typeof Tabs> = (args) => <Tabs {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  items: tabItems,
};
