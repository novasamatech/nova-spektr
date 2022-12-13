import { ComponentMeta, ComponentStory } from '@storybook/react';

import { Icon } from '@renderer/components/ui';
import Popover from './Popover';

export default {
  title: 'Popover',
  component: Popover,
  parameters: { actions: { argTypesRegex: '^on.*' } },
  decorators: [
    (Story) => (
      <div className="mt-28 mx-auto w-max">
        <Story />
      </div>
    ),
  ],
} as ComponentMeta<typeof Popover>;

const Template: ComponentStory<typeof Popover> = (args) => <Popover {...args} />;

export const Default = Template.bind({});
Default.args = {
  titleText: 'Popover title',
  titleIcon: <Icon name="btc" size={16} />,
  content: 'Staking will automatically start when the next era starts',
  children: <div className="py-2 px-3 bg-gray-200 w-40 text-center">Hover me</div>,
};
