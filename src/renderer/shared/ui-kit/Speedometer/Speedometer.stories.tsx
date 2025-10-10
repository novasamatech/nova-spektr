import { type Meta, type StoryObj } from '@storybook/react-vite';

import { Speedometer } from './Speedomenter';

const meta: Meta<typeof Speedometer> = {
  title: 'Design System/kit/Speedometer',
  component: Speedometer,
};

export default meta;

type Story = StoryObj<typeof Speedometer>;

export const Default: Story = {
  args: {
    value: 50,
    max: 100,
  },
};

export const Empty: Story = {
  args: {
    value: 0,
    max: 100,
  },
};

export const Full: Story = {
  args: {
    value: 100,
    max: 100,
  },
};

export const ThreeQuarters: Story = {
  args: {
    value: 75,
    max: 100,
  },
};

export const GreyVariant: Story = {
  args: {
    value: 50,
    max: 100,
    variant: 'grey',
  },
};

export const GreyVariantFull: Story = {
  args: {
    value: 100,
    max: 100,
    variant: 'grey',
  },
};

export const SmallSize: Story = {
  args: {
    value: 50,
    max: 100,
    size: 50,
  },
};

export const LargeSize: Story = {
  args: {
    value: 50,
    max: 100,
    size: 150,
  },
};
