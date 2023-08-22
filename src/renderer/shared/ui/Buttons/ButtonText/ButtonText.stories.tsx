import { ComponentMeta, ComponentStory } from '@storybook/react';

import { ButtonText } from './ButtonText';

export default {
  title: 'ui/Buttons/ButtonText',
  component: ButtonText,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof ButtonText>;

const Template: ComponentStory<typeof ButtonText> = (args) => <ButtonText {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  children: 'Hello button',
};

export const Prefix = Template.bind({});
Prefix.args = {
  children: 'Hello button',
  disabled: false,
  icon: 'address-book',
};
