import { ComponentMeta, ComponentStory } from '@storybook/react';

import { Popover } from './Popover';

export default {
  title: 'Popover ',
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

export const OnHover = Template.bind({});
OnHover.args = {
  content: 'Staking will automatically start when the next era starts',
  contentClass: 'p-2',
  children: <button className="py-2 px-3 bg-gray-200 w-40 text-center">Hover me</button>,
};
