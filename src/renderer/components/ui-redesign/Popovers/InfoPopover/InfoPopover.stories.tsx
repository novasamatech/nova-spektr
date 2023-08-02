import { Meta, StoryFn } from '@storybook/react';

import InfoPopover from './InfoPopover';
import { popoverItems } from './InfoPopover.test';

export default {
  title: 'Redesign/Info Popover',
  component: InfoPopover,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as Meta<typeof InfoPopover>;

const Template: StoryFn<typeof InfoPopover> = (args) => <InfoPopover {...args} />;
export const Primary = Template.bind({});
Primary.args = {
  data: popoverItems,
  children: <button>click me</button>,
};
