import { ComponentMeta, ComponentStory } from '@storybook/react';

import Button, { ViewColor, ViewType } from './Button';

export default {
  title: 'Button',
  component: Button,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof Button>;

const Template: ComponentStory<typeof Button> = (args) => <Button {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  view: [ViewType.Outline, ViewColor.Primary],
  children: 'Hello button',
  disabled: false,
};
