import { Meta, StoryFn } from '@storybook/react';

import Shimmering from './Shimmering';

export default {
  title: 'Shimmering',
  component: Shimmering,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as Meta<typeof Shimmering>;

const Template: StoryFn<typeof Shimmering> = (args) => <Shimmering {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  width: 200,
  height: 40,
};

export const Height = Template.bind({});
Height.args = {
  height: 40,
};
