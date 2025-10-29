import { type Meta, type StoryObj } from '@storybook/react-vite';

import { type Address } from '@/shared/core';
import { TEST_ADDRESS, TEST_EVM_ADDRESS } from '@/shared/lib/utils';

import { Identicon } from './Identicon';

const meta: Meta<typeof Identicon> = {
  title: 'Design System/entities/Identicon',
  component: Identicon,
  args: {
    address: TEST_ADDRESS,
  },
};

export default meta;

type Story = StoryObj<typeof Identicon>;

export const Default: Story = {
  args: {
    address: TEST_ADDRESS,
  },
};

export const Invalid: Story = {
  args: {
    address: '1234' as Address,
  },
};

export const ForcedInvalidState: Story = {
  args: {
    invalid: true,
  },
};

export const EtheriumAddress: Story = {
  args: {
    address: TEST_EVM_ADDRESS,
  },
};

export const ValueAsAccountId: Story = {
  args: {
    address: Default.args?.address,
  },
};

export const CustomSize: Story = {
  args: {
    size: 50,
  },
};

export const WithoutBackground: Story = {
  args: {
    background: false,
  },
};

export const WithoutCopy: Story = {
  args: {
    canCopy: false,
  },
};
