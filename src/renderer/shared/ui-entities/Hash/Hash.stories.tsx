import { type Meta, type StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';

import { TEST_HASH } from '@/shared/lib/utils';
import { Box } from '@/shared/ui-kit';

import { Hash } from './Hash';

const meta: Meta<typeof Hash> = {
  title: 'Design System/entities/Hash',
  component: Hash,
  args: {
    value: TEST_HASH,
  },
};

export default meta;

type Story = StoryObj<typeof Hash>;

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
    const Hash = await canvas.findByTestId('Hash');
    expect(Hash.textContent).toBe(TEST_HASH);
  },
};

export const Truncate: Story = {
  args: {
    variant: 'truncate',
  },
  decorators: [
    Story => (
      <div className="w-[200px] resize-x overflow-hidden">
        <Story />
      </div>
    ),
  ],
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const Hash = await canvas.findByTestId('Hash');
    await new Promise(resolve => setTimeout(resolve, 500));
    expect(Hash.innerText).toBe('0x91b171bb15...da7a70ce90c3');
  },
};

export const TruncateWithoutBoundaries: Story = {
  args: {
    variant: 'truncate',
  },
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const Hash = await canvas.findByTestId('Hash');
    await new Promise(resolve => setTimeout(resolve, 500));
    expect(Hash.innerText).toBe(TEST_HASH);
  },
};

export const Short: Story = {
  args: {
    variant: 'short',
  },
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const Hash = await canvas.findByTestId('Hash');
    expect(Hash.innerText).toBe('0x91b171...70ce90c3');
  },
};
