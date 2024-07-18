import { type ComponentMeta, type ComponentStory } from '@storybook/react';

import { Tooltip } from './Tooltip';

export default {
  title: 'Tooltip ',
  component: Tooltip,
  parameters: { actions: { argTypesRegex: '^on.*' } },
  decorators: [
    (Story) => (
      <div className="mt-28 mx-auto w-max">
        <Story />
      </div>
    ),
  ],
} as ComponentMeta<typeof Tooltip>;

const Template: ComponentStory<typeof Tooltip> = (args) => <Tooltip {...args} />;

export const Default = Template.bind({});
Default.args = {
  content: 'Staking will automatically start when the next era starts',
  contentClass: 'p-2',
  children: <p className="py-2 px-3 bg-gray-200 w-40 text-center">Hover me</p>,
};
