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
  iconName: 'globe',
};

export const PopoverLink = Template.bind({});
PopoverLink.args = {
  children: (
    <Popover contentClass="text-redesign-shade-56 p-2" content="something important">
      Opens popover oh hover
    </Popover>
  ),
};
