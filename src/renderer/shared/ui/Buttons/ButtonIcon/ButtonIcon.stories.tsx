import { ComponentMeta, ComponentStory } from '@storybook/react';

import { ButtonIcon } from './ButtonIcon';

export default {
  title: 'ui/Buttons/ButtonIcon',
  component: ButtonIcon,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof ButtonIcon>;

const Template: ComponentStory<typeof ButtonIcon> = (args) => <ButtonIcon {...args} />;

export const Background = Template.bind({});
Background.args = {
  icon: 'close',
  size: 'sm',
  background: true,
};

export const NoBackground = Template.bind({});
NoBackground.args = {
  icon: 'close',
  size: 'sm',
  background: false,
};
