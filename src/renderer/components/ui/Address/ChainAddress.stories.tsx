import { ComponentStory, ComponentMeta } from '@storybook/react';

import ChainAddress from './ChainAddress';

export default {
  title: 'Address',
  component: ChainAddress,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof ChainAddress>;

const Template: ComponentStory<typeof ChainAddress> = (args) => <ChainAddress {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  address: '5F3sa2TJAWMqDhXG6jhV4N8ko9SxwGy8TpaNS1repo5EYjQX',
};

export const Full = Template.bind({});
Full.args = {
  address: '5F3sa2TJAWMqDhXG6jhV4N8ko9SxwGy8TpaNS1repo5EYjQX',
  type: 'full',
};
