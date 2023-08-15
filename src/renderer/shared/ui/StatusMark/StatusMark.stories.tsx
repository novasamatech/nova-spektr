import { ComponentMeta, ComponentStory } from '@storybook/react';

import { StatusMark } from './StatusMark';

export default {
  title: 'ui/StatusMark',
  component: StatusMark,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof StatusMark>;

const Template: ComponentStory<typeof StatusMark> = (args) => <StatusMark {...args} />;
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
