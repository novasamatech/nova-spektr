import { type Meta, type StoryFn } from '@storybook/react';

import { VoteChart } from './VoteChart';

export default {
  title: 'VoteChart',
  component: VoteChart,
  parameters: { actions: { argTypesRegex: '^on.*' } },
  decorators: [
    (Story) => (
      <div className="m-15 w-[302px]">
        <Story />
      </div>
    ),
  ],
} as Meta<typeof VoteChart>;

const Template: StoryFn<typeof VoteChart> = (args) => <VoteChart {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  aye: 70,
  nay: 30,
  pass: 50,
};

export const Large = Template.bind({});
Large.args = {
  aye: 1,
  nay: 99,
  pass: 50,
  descriptionPosition: 'bottom',
};
