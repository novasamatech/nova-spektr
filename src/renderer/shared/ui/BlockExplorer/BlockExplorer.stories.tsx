import { type ComponentMeta, type ComponentStory } from '@storybook/react';

import { BlockExplorer } from './BlockExplorer';

const meta: ComponentMeta<typeof BlockExplorer> = {
  title: 'BlockExplorer',
  component: BlockExplorer,
  parameters: { actions: { argTypesRegex: '^on.*' } },
};

export default meta;

const Template: ComponentStory<typeof BlockExplorer> = (args) => <BlockExplorer {...args} />;

export const Default = Template.bind({});
Default.args = {
  href: '#',
  icon: 'polkassembly',
  children: 'This is block explorer link',
};
