import { ComponentStory, ComponentMeta } from '@storybook/react';

import { Duration } from './Duration';

export default {
  title: 'Duration',
  component: Duration,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof Duration>;

const Template: ComponentStory<typeof Duration> = (args) => <Duration {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  seconds: '1',
};
