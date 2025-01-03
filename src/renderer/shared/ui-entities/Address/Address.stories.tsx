import { type Meta, type StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';

import { TEST_ADDRESS } from '@/shared/lib/utils';
import { Box } from '@/shared/ui-kit';

import { Address } from './Address';

const meta: Meta<typeof Address> = {
  title: 'Design System/entities/Address',
  component: Address,
  args: {
    address: TEST_ADDRESS,
  },
};

export default meta;

type Story = StoryObj<typeof Address>;

export const Default: Story = {};

export const WithIcon: Story = {
  args: {
    showIcon: true,
  },
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const icon = await canvas.findByTestId(`identicon-${TEST_ADDRESS}`);
    await new Promise(resolve => setTimeout(resolve, 500));
    expect(icon).toBeTruthy();
  },
};

export const Full: Story = {
  args: {
    variant: 'full',
  },
  decorators: [
    Story => (
      <Box width="200px">
        <Story />
      </Box>
    ),
  ],
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const address = await canvas.findByTestId('Address');
    expect(address.textContent).toBe(TEST_ADDRESS);
  },
};

export const Truncate: Story = {
  args: {
    variant: 'truncate',
  },
  decorators: [
    Story => (
      <Box width="200px">
        <Story />
      </Box>
    ),
  ],
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const address = await canvas.findByTestId('Address');
    await new Promise(resolve => setTimeout(resolve, 500));
    expect(address.innerText).toBe('1ChFWeNRLarA...eWz7jX7iTVZ');
  },
};

export const Short: Story = {
  args: {
    variant: 'short',
  },
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const address = await canvas.findByTestId('Address');
    expect(address.innerText).toBe('1ChFWeNR...7jX7iTVZ');
  },
};

export const WithTitle: Story = {
  args: {
    title: 'John Doe',
    variant: 'truncate',
  },
  decorators: [
    Story => (
      <Box width="200px">
        <Story />
      </Box>
    ),
  ],
};

export const ReplaceAddressWithTitle: Story = {
  args: {
    title: 'John Doe',
    hideAddress: true,
    showIcon: true,
  },
  decorators: [
    Story => (
      <Box width="200px">
        <Story />
      </Box>
    ),
  ],
};
