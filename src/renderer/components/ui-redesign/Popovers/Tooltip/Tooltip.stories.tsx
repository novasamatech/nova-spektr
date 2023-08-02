import { Meta, StoryFn } from '@storybook/react';

import { Tooltip } from './Tooltip';

export default {
  title: 'Redesign/Tooltip ',
  component: Tooltip,
  parameters: { actions: { argTypesRegex: '^on.*' } },
  decorators: [
    (Story) => (
      <div className="mt-28 mx-auto w-max">
        <Story />
      </div>
    ),
  ],
} as Meta<typeof Tooltip>;

const Template: StoryFn<typeof Tooltip> = (args) => <Tooltip {...args} />;

export const Default = Template.bind({});
Default.args = {
  content: 'Staking will automatically start when the next era starts',
  contentClass: 'p-2',
  children: <p className="py-2 px-3 bg-gray-200 w-40 text-center">Hover me</p>,
};
