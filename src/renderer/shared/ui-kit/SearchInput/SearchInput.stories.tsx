import { type Meta, type StoryObj } from '@storybook/react';

import { SearchInput } from './SearchInput';

const meta: Meta<typeof SearchInput> = {
  title: 'Design System/kit/SearchInput',
  component: SearchInput,
  args: {
    value: 'This is value',
  },
};

export default meta;

type Story = StoryObj<typeof SearchInput>;

export const Default: Story = {
  args: {
    value: '',
    placeholder: 'Test input',
  },
};

export const Filled: Story = {};

export const Invalid: Story = {
  args: {
    invalid: true,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
