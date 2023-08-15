import { ComponentMeta, ComponentStory } from '@storybook/react';

import { IconButton } from './IconButton';

export default {
  title: 'ui/Icon Button',
  component: IconButton,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof IconButton>;

const Template: ComponentStory<typeof IconButton> = (args) => <IconButton {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  name: 'settings-lite',
};
