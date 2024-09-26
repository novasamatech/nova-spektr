import { type Meta, type StoryFn } from '@storybook/react';

import { Duration } from './Duration';

export default {
  title: 'Duration',
  component: Duration,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as Meta<typeof Duration>;

const Template: StoryFn<typeof Duration> = (args) => <Duration {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  seconds: '1',
};
