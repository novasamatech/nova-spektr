import { type Meta, type StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';

import { Icon, IconButton } from '@/shared/ui';

import { Input } from './Input';

const meta: Meta<typeof Input> = {
  title: 'Design System/kit/Input',
  component: Input,
  args: {
    testId: 'input',
    value: 'This is value',
  },
};

export default meta;

type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: {
    value: '',
    placeholder: 'Test input',
  },

  async play({ args, canvasElement }) {
    const canvas = within(canvasElement);
    const Input = await canvas.findByTestId<HTMLInputElement>('input');
    expect(Input.value).toEqual(args.value);
    expect(Input.placeholder).toEqual(args.placeholder);
  },
};

export const Filled: Story = {
  async play({ args, canvasElement }) {
    const canvas = within(canvasElement);
    const Input = await canvas.findByTestId<HTMLInputElement>('input');
    expect(Input.value).toEqual(args.value);
  },
};

export const Invalid: Story = {
  args: {
    invalid: true,
  },

  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const Input = await canvas.findByTestId<HTMLInputElement>('input');
    expect(Input).toHaveClass('border-filter-border-negative');
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },

  async play({ args, canvasElement }) {
    const canvas = within(canvasElement);
    const Input = await canvas.findByTestId<HTMLInputElement>('input');
    expect(Input.disabled).toEqual(args.disabled);
  },
};

export const Prefix: Story = {
  args: {
    prefixElement: <Icon name="search" className="text-text-secondary" size={16} />,
  },

  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const Prefix = await canvas.findByTestId('search-svg');
    expect(Prefix).toBeInTheDocument();
  },
};

export const Suffix: Story = {
  args: {
    suffixElement: <IconButton name="btc" size={16} />,
  },

  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const Suffix = await canvas.findByTestId('warnCutout-svg');
    expect(Suffix).toBeInTheDocument();
  },
};
