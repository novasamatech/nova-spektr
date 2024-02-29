import { ComponentStory, ComponentMeta } from '@storybook/react';

import PopoverLink from './PopoverLink';
import { Popover } from '@shared/ui/Popovers/Popover/Popover';

export default {
  title: 'Redesign/Popover Link',
  component: PopoverLink,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof PopoverLink>;

const PopoverTemplate: ComponentStory<typeof PopoverLink> = (args) => (
  <Popover contentClass="text-text-primary p-2" content="something important">
    <PopoverLink {...args} />
  </Popover>
);
export const WithIcon = PopoverTemplate.bind({});
WithIcon.args = {
  showIcon: true,
  children: 'opens popover on hover',
};
