import { ComponentStory, ComponentMeta } from '@storybook/react';

import { Address } from '@renderer/components/ui';

export default {
  title: 'Address',
  component: Address,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof Address>;

const Template: ComponentStory<typeof Address> = (args) => <Address {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  address: '5F3sa2TJAWMqDhXG6jhV4N8ko9SxwGy8TpaNS1repo5EYjQX',
};

export const Full = Template.bind({});
Full.args = {
  address: '5F3sa2TJAWMqDhXG6jhV4N8ko9SxwGy8TpaNS1repo5EYjQX',
  full: true,
};
