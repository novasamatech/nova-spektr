import { ComponentMeta, ComponentStory } from '@storybook/react';

import { VoteChartSm } from './VoteChartSm';

export default {
  title: 'VoteChart',
  component: VoteChartSm,
  parameters: { actions: { argTypesRegex: '^on.*' } },
  decorators: [
    (Story) => (
      <div className="m-15 w-[302px]">
        <Story />
      </div>
    ),
  ],
} as ComponentMeta<typeof VoteChartSm>;

const Template: ComponentStory<typeof VoteChartSm> = (args) => <VoteChartSm {...args} />;

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
