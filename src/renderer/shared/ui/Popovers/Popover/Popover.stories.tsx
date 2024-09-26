import { type Meta, type StoryFn } from '@storybook/react';

import { Popover } from './Popover';

export default {
  title: 'Popover ',
  component: Popover,
  parameters: { actions: { argTypesRegex: '^on.*' } },
  decorators: [
    (Story) => (
      <div className="mx-auto mt-28 w-max">
        <Story />
      </div>
    ),
  ],
} as Meta<typeof Popover>;

const Template: StoryFn<typeof Popover> = (args) => <Popover {...args} />;

export const OnHover = Template.bind({});
OnHover.args = {
  content: 'Staking will automatically start when the next era starts',
  contentClass: 'p-2',
  children: <button className="w-40 bg-gray-200 px-3 py-2 text-center">Hover me</button>,
};
