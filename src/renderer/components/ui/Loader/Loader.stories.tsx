import { Meta, StoryFn } from '@storybook/react';

import Loader from './Loader';

export default {
  title: 'Redesign/Loader ',
  component: Loader,
  parameters: { actions: { argTypesRegex: '^on.*' } },
  decorators: [
    (Story) => (
      <div className="mt-28 mx-auto w-[200px] bg-gray-200 rounded-lg">
        <Story />
      </div>
    ),
  ],
} as Meta<typeof Loader>;

const Template: StoryFn<typeof Loader> = (args) => <Loader {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  size: 50,
  color: 'primary',
};

export const White = Template.bind({});
White.args = {
  size: 50,
  color: 'white',
};
