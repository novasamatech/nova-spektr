import { ComponentMeta, ComponentStory } from '@storybook/react';

import { Icon } from '../../Icon/Icon';
import { Button } from './Button';
export default {
  title: 'ui/Buttons/Button',
  component: Button,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof Button>;

const Template: ComponentStory<typeof Button> = (args) => <Button {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  pallet: 'primary',
  children: 'Hello button',
};

export const Prefix = Template.bind({});
Prefix.args = {
  pallet: 'primary',
  children: 'Hello button',
  disabled: false,
  icon: 'address-book',
};

export const PrefixText = Template.bind({});
PrefixText.args = {
  pallet: 'primary',
  children: 'Hello button',
  disabled: false,
  icon: 'address-book',
};

export const Suffix = Template.bind({});
Suffix.args = {
  pallet: 'primary',
  children: 'Hello button',
  className: 'w-[200px]',
  disabled: false,
  suffixElement: <Icon name="address-book" className="text-white" size={16} />,
};

export const Both = Template.bind({});
Both.args = {
  pallet: 'primary',
  children: 'Hello button',
  className: 'w-[200px]',
  disabled: false,
  icon: 'address-book',
  suffixElement: <Icon name="assets" className="text-white" size={16} />,
};
