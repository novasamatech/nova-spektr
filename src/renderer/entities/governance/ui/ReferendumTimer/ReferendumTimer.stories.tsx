import { type ComponentMeta, type ComponentStory } from '@storybook/react';

import { ReferendumTimer } from './ReferendumTimer';

export default {
  title: 'ReferendumTimer',
  component: ReferendumTimer,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof ReferendumTimer>;

const Template: ComponentStory<typeof ReferendumTimer> = (args) => <ReferendumTimer {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  status: 'execute',
  time: 60000,
};

export const Pending = Template.bind({});
Pending.args = {
  status: 'approve',
  time: 600000,
};
