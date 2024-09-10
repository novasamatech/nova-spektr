import { type Meta, type StoryFn } from '@storybook/react';

import { ButtonCard } from './ButtonCard';

export default {
  title: 'ButtonCard',
  component: ButtonCard,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as Meta<typeof ButtonCard>;

const Template: StoryFn<typeof ButtonCard> = (args) => <ButtonCard {...args} />;

export const Secondary = Template.bind({});
Secondary.args = {
  icon: 'thumbUp',
  pallet: 'secondary',
  children: 'Hello button',
};

export const Positive = Template.bind({});
Positive.args = {
  icon: 'thumbUp',
  pallet: 'positive',
  children: 'Hello button',
};
export const Negative = Template.bind({});
Negative.args = {
  icon: 'thumbUp',
  pallet: 'negative',
  children: 'Hello button',
};
