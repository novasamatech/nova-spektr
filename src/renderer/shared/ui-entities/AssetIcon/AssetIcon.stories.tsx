import { type Meta, type StoryObj } from '@storybook/react';

import { dotAsset } from '@/shared/mocks';

import { AssetIcon } from './AssetIcon';

const meta: Meta<typeof AssetIcon> = {
  title: 'Design System/entities/AssetIcon',
  component: AssetIcon,
  render: (args) => <AssetIcon {...args} />,
};

export default meta;

type Story = StoryObj<typeof AssetIcon>;

export const Colored: Story = {
  args: {
    asset: dotAsset,
    style: 'colored',
  },
};

export const Monochrome: Story = {
  args: {
    asset: dotAsset,
    style: 'monochrome',
  },
};
