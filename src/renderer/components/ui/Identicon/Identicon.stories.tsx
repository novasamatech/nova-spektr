import { ComponentMeta, ComponentStory } from '@storybook/react';

import Identicon from './Identicon';

export default {
  title: 'Identicon',
  component: Identicon,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof Identicon>;

const Template: ComponentStory<typeof Identicon> = (args) => <Identicon {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  size: 50,
  address: '5F3sa2TJAWMqDhXG6jhV4N8ko9SxwGy8TpaNS1repo5EYjQX',
};
