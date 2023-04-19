import { ComponentStory, ComponentMeta } from '@storybook/react';

import InfoLink from './InfoLink';
import Popover from '@renderer/components/ui-redesign/Popovers/Popover/Popover';

export default {
  title: 'Redesign/Info Link',
  component: InfoLink,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof InfoLink>;

const Template: ComponentStory<typeof InfoLink> = (args) => <InfoLink {...args} />;

export const ExternalLink = Template.bind({});
ExternalLink.args = {
  url: 'https://test.com',
  children: 'This is my link',
  showIcon: true,
  iconName: 'globe',
};

const PopoverTemplate: ComponentStory<typeof InfoLink> = (args) => (
  <Popover contentClass="text-text-primary p-2" content="something important">
    <InfoLink {...args} />
  </Popover>
);
export const PopoverLink = PopoverTemplate.bind({});
PopoverLink.args = {
  showIcon: true,
  children: 'opens popover on hover',
};
