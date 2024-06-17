import { ComponentMeta, ComponentStory } from '@storybook/react';

import { VoteChartLg } from './VoteChartLg';

export default {
  title: 'VoteChart',
  component: VoteChartLg,
  parameters: { actions: { argTypesRegex: '^on.*' } },
  decorators: [
    (Story) => (
      <div className="m-15 w-[302px]">
        <Story />
      </div>
    ),
  ],
} as ComponentMeta<typeof VoteChartLg>;

const Template: ComponentStory<typeof VoteChartLg> = (args) => <VoteChartLg {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  aye: 70,
  nay: 30,
};

export const Large = Template.bind({});
Large.args = {
  aye: 1,
  nay: 99,
};
