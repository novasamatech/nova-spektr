import { type Meta, type StoryFn } from '@storybook/react';

import { ReferendumTimer } from './ReferendumTimer';

export default {
  title: 'ReferendumTimer',
  component: ReferendumTimer,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as Meta<typeof ReferendumTimer>;

const Template: StoryFn<typeof ReferendumTimer> = (args) => <ReferendumTimer {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  status: 'Execute',
  time: 60000,
};

export const Pending = Template.bind({});
Pending.args = {
  status: 'Passing',
  time: 600000,
};
