import { ComponentMeta, ComponentStory } from '@storybook/react';

import { Icon } from '@renderer/components/ui';
import Button from './Button';

export default {
  title: 'Button Redesign',
  component: Button,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof Button>;

const Template: ComponentStory<typeof Button> = (args) => <Button {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  variant: 'fill',
  pallet: 'primaryNew',
  children: 'Hello button',
  className: 'w-[200px]',
  disabled: false,
};

export const Prefix = Template.bind({});
Prefix.args = {
  variant: 'fill',
  pallet: 'primaryNew',
  children: 'Hello button',
  className: 'w-[200px]',
  disabled: false,
  prefixElement: <Icon name="balance" className="text-white" size={16} />,
};

export const PrefixText = Template.bind({});
PrefixText.args = {
  variant: 'text',
  pallet: 'primaryNew',
  children: 'Hello button',
  className: 'w-[200px]',
  disabled: false,
  prefixElement: <Icon name="balance" className="text-primaryNew" size={16} />,
};

export const Suffix = Template.bind({});
Suffix.args = {
  variant: 'fill',
  pallet: 'primaryNew',
  children: 'Hello button',
  className: 'w-[200px]',
  disabled: false,
  suffixElement: <Icon name="balance" className="text-white" size={16} />,
};

export const Both = Template.bind({});
Both.args = {
  variant: 'fill',
  pallet: 'primaryNew',
  children: 'Hello button',
  className: 'w-[200px]',
  disabled: false,
  prefixElement: <Icon name="balance" className="text-white" size={16} />,
  suffixElement: <Icon name="asset" className="text-white" size={16} />,
};

export const OnlyIcon = Template.bind({});
OnlyIcon.args = {
  variant: 'fill',
  pallet: 'primaryNew',
  children: <Icon name="balance" className="text-primaryNew" size={16} />,
  disabled: false,
};
