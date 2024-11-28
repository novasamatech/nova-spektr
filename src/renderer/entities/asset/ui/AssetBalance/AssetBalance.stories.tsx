import { type Meta, type StoryFn } from '@storybook/react';

import { dotAsset } from '@/shared/mocks';

import { AssetBalance } from './AssetBalance';

export default {
  title: 'v1/entities/Token balance',
  component: AssetBalance,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as Meta<typeof AssetBalance>;

const Template: StoryFn<typeof AssetBalance> = (args) => <AssetBalance {...args} />;

export const Default = Template.bind({});
Default.args = {
  asset: dotAsset,
  value: '10000000',
  showIcon: true,
};
