import { ComponentMeta, ComponentStory } from '@storybook/react';

import InfoPopover from './InfoPopover';
import { popoverItems } from '@renderer/components/ui-redesign/Popovers/InfoPopover/InfoPopover.test';

export default {
  title: 'Info popover',
  component: InfoPopover,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof InfoPopover>;

const Template: ComponentStory<typeof InfoPopover> = (args) => <InfoPopover {...args} />;
export const Primary = Template.bind({});
Primary.args = {
  data: popoverItems,
  children: <button>click me</button>,
};
