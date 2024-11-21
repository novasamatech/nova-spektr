import { type Meta, type StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';

import { TextArea } from './TextArea';

const LONG_TEXT =
  'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Culpa doloribus iusto possimus praesentium ratione temporibus. Aperiam autem cumque esse eum fugit laborum quas! Architecto at, cupiditate dignissimos eveniet sunt voluptatibus.';

const meta: Meta<typeof TextArea> = {
  title: 'Design System/kit/TextArea',
  component: TextArea,
  args: {
    value: LONG_TEXT,
    testId: 'text-area',
  },
};

export default meta;

type Story = StoryObj<typeof TextArea>;

export const Default: Story = {
  args: {
    rows: 3,
    maxLength: 120,
    value: '',
    placeholder: 'Max length is 120',
  },

  async play({ args, canvasElement }) {
    const canvas = within(canvasElement);
    const textArea = await canvas.findByTestId<HTMLTextAreaElement>('text-area');
    expect(textArea.value).toEqual(args.value);
    expect(textArea.placeholder).toEqual(args.placeholder);
  },
};

export const Filled: Story = {
  args: {
    rows: 2,
  },

  async play({ args, canvasElement }) {
    const canvas = within(canvasElement);
    const textArea = await canvas.findByTestId<HTMLTextAreaElement>('text-area');
    expect(textArea.value).toEqual(args.value);
  },
};

export const Invalid: Story = {
  args: {
    rows: 1,
    invalid: true,
  },

  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const textArea = await canvas.findByTestId<HTMLTextAreaElement>('text-area');
    expect(textArea).toHaveClass('border-filter-border-negative');
  },
};

export const Disabled: Story = {
  args: {
    rows: 1,
    disabled: true,
  },

  async play({ args, canvasElement }) {
    const canvas = within(canvasElement);
    const textArea = await canvas.findByTestId<HTMLTextAreaElement>('text-area');
    expect(textArea.disabled).toEqual(args.disabled);
  },
};
