import { type Meta, type StoryFn } from '@storybook/react';

import { StatusLabel } from './StatusLabel';

export default {
  title: 'StatusLabel',
  component: StatusLabel,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as Meta<typeof StatusLabel>;

const Template: StoryFn<typeof StatusLabel> = (args) => <StatusLabel {...args} />;
export const Waiting = Template.bind({});
Waiting.args = {
  title: '@user_name:matrix.org',
  variant: 'waiting',
};

export const Success = Template.bind({});
Success.args = {
  title: '@user_name:matrix.org',
  subtitle: 'Session verified',
  variant: 'success',
};
