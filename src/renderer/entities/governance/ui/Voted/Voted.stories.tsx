import { type Meta, type StoryFn } from '@storybook/react';

import { Voted } from './Voted';

export default {
  title: 'Voted',
  component: Voted,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as Meta<typeof Voted>;

const Template: StoryFn<typeof Voted> = (args) => <Voted {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  active: true,
};
