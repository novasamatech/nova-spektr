import { ComponentMeta, ComponentStory } from '@storybook/react';

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
} as ComponentMeta<typeof VoteChart>;

const Template: ComponentStory<typeof VoteChart> = (args) => <VoteChart {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  aye: 70,
  nay: 30,
};

export const Large = Template.bind({});
Large.args = {
  aye: 1,
  nay: 99,
  size: 'lg',
};
