import { ComponentMeta, ComponentStory } from '@storybook/react';

import InfoPopover from './InfoPopover';
import { popoverItems } from './InfoPopover.test';

export default {
  title: 'Redesign/Info Popover',
  component: InfoPopover,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof InfoPopover>;

const Template: ComponentStory<typeof InfoPopover> = (args) => <InfoPopover {...args} />;
export const Primary = Template.bind({});
Primary.args = {
  data: popoverItems,
  children: <button>click me</button>,
};
