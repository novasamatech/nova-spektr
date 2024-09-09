import { type Meta, type StoryFn } from '@storybook/react';

import { Icon } from '@shared/ui';

import { Button } from './Button';

export default {
  title: 'Button',
  component: Button,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as Meta<typeof Button>;

const Template: StoryFn<typeof Button> = (args) => <Button {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  variant: 'fill',
  pallet: 'primary',
  children: 'Hello button',
};

export const Prefix = Template.bind({});
Prefix.args = {
  variant: 'fill',
  pallet: 'primary',
  children: 'Hello button',
  disabled: false,
  prefixElement: <Icon name="network" className="text-white" size={16} />,
};

export const PrefixText = Template.bind({});
PrefixText.args = {
  variant: 'text',
  pallet: 'primary',
  children: 'Hello button',
  disabled: false,
  prefixElement: <Icon name="network" className="text-redesign-primary" size={16} />,
};

export const Suffix = Template.bind({});
Suffix.args = {
  variant: 'fill',
  pallet: 'primary',
  children: 'Hello button',
  className: 'w-[200px]',
  disabled: false,
  suffixElement: <Icon name="network" className="text-white" size={16} />,
};

export const Both = Template.bind({});
Both.args = {
  variant: 'fill',
  pallet: 'primary',
  children: 'Hello button',
  className: 'w-[200px]',
  disabled: false,
  prefixElement: <Icon name="network" className="text-white" size={16} />,
  suffixElement: <Icon name="asset" className="text-white" size={16} />,
};

export const OnlyIcon = Template.bind({});
OnlyIcon.args = {
  variant: 'fill',
  pallet: 'primary',
  children: <Icon name="network" className="text-redesign-primary" size={16} />,
  disabled: false,
};
