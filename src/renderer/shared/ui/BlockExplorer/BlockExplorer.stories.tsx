import { ComponentStory, ComponentMeta } from '@storybook/react';

import { BlockExplorer } from './BlockExplorer';

export default {
  title: 'BlockExplorer',
  component: BlockExplorer,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof BlockExplorer>;

const Template: ComponentStory<typeof BlockExplorer> = (args) => <BlockExplorer {...args} />;

export const Default = Template.bind({});
Default.args = {
  children: 'Explorer title',
  href: '#',
};
