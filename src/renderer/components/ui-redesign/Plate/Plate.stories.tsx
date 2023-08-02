import { StoryFn, Meta } from '@storybook/react';

import Plate from './Plate';

export default {
  title: 'PlateRedesign',
  component: Plate,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as Meta<typeof Plate>;

const Template: StoryFn<typeof Plate> = (args) => <Plate {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  children: 'This is simple content',
};
