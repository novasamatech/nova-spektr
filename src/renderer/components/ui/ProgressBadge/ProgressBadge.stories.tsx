import { ComponentMeta, ComponentStory } from '@storybook/react';

import ProgressBadge from './ProgressBadge';

export default {
  title: 'ProgressBadge',
  component: ProgressBadge,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof ProgressBadge>;

const Template: ComponentStory<typeof ProgressBadge> = (args) => <ProgressBadge {...args} />;

export const InProgress = Template.bind({});
InProgress.args = {
  progress: 1,
  total: 3,
  children: 'Test content',
};

export const Complete = Template.bind({});
Complete.args = {
  progress: 5,
  total: 5,
  children: 'Test content',
};
