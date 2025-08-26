import { type Meta, type StoryObj } from '@storybook/react-vite';

import { TEST_ADDRESS, TEST_EVM_ADDRESS, toAccountId } from '@/shared/lib/utils';

import { Identicon } from './Identicon';

const meta: Meta<typeof Identicon> = {
  title: 'Design System/entities/Identicon',
  component: Identicon,
  args: {
    value: TEST_ADDRESS,
  },
};

export default meta;

type Story = StoryObj<typeof Identicon>;

export const Default: Story = {
  args: {
    value: TEST_ADDRESS,
  },
};

export const Invalid: Story = {
  args: {
    value: '1234',
  },
};

export const EtheriumAddress: Story = {
  args: {
    value: TEST_EVM_ADDRESS,
  },
};

export const ValueAsAccountId: Story = {
  args: {
    value: toAccountId(Default.args?.value ?? ''),
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
