import { type Meta, type StoryFn } from '@storybook/react';

import { Counter } from './Counter';

export default {
  title: 'Counter',
  component: Counter,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as Meta<typeof Counter>;

const Template: StoryFn<typeof Counter> = (args) => <Counter {...args} />;
export const Waiting = Template.bind({});
Waiting.args = {
  variant: 'waiting',
  children: 5,
};

export const Success = Template.bind({});
Success.args = {
  variant: 'success',
  children: '21',
};
