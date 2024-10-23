import { type Meta, type StoryFn } from '@storybook/react';

import { BlockExplorer } from './BlockExplorer';

const meta: Meta<typeof BlockExplorer> = {
  title: 'v1/ui/BlockExplorer',
  component: BlockExplorer,
  parameters: { actions: { argTypesRegex: '^on.*' } },
};

export default meta;

const Template: StoryFn<typeof BlockExplorer> = (args) => <BlockExplorer {...args} />;

export const Default = Template.bind({});
Default.args = {
  href: '#',
  icon: 'polkassembly',
  children: 'This is block explorer link',
};
