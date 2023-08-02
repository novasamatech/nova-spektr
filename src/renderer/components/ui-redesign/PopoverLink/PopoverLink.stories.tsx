import { StoryFn, Meta } from '@storybook/react';

import PopoverLink from './PopoverLink';
import { Popover } from '@renderer/components/ui-redesign/Popovers/Popover/Popover';

export default {
  title: 'Redesign/Popover Link',
  component: PopoverLink,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as Meta<typeof PopoverLink>;

const PopoverTemplate: StoryFn<typeof PopoverLink> = (args) => (
  <Popover contentClass="text-text-primary p-2" content="something important">
    <PopoverLink {...args} />
  </Popover>
);
export const WithIcon = PopoverTemplate.bind({});
WithIcon.args = {
  showIcon: true,
  children: 'opens popover on hover',
};
