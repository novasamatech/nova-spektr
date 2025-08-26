import { type Meta, type StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, within } from 'storybook/test';

import { Box } from '../Box/Box';

import { TextArea } from './TextArea';

const LONG_TEXT =
  'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Culpa doloribus iusto possimus praesentium ratione temporibus. Aperiam autem cumque esse eum fugit laborum quas! Architecto at, cupiditate dignissimos eveniet sunt voluptatibus.';

const meta: Meta<typeof TextArea> = {
  title: 'Design System/kit/TextArea',
  component: TextArea,
  args: {
    value: LONG_TEXT,
    rows: 3,
  },
  decorators: [
    Story => (
      <Box width="500px">
        <Story />
      </Box>
    ),
    (Story, { args }) => {
      const [value, onChange] = useState(args.value ?? '');
      return <Story args={{ ...args, value, onChange }} />;
    },
  ],
};

export default meta;

type Story = StoryObj<typeof TextArea>;

export const Default: Story = {
  args: {
    rows: 3,
    maxLength: 120,
    placeholder: 'Max length is 120',
  },

  async play({ args, canvasElement }) {
    const canvas = within(canvasElement);
    const textArea = await canvas.findByTestId<HTMLTextAreaElement>('TextArea');
    expect(textArea.value).toEqual(args.value);
    expect(textArea.placeholder).toEqual(args.placeholder);
  },
};

export const Invalid: Story = {
  args: {
    invalid: true,
  },

  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const textArea = await canvas.findByTestId<HTMLTextAreaElement>('TextArea');
    expect(textArea).toHaveAttribute('data-invalid');
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },

  async play({ args, canvasElement }) {
    const canvas = within(canvasElement);
    const textArea = await canvas.findByTestId<HTMLTextAreaElement>('TextArea');
    expect(textArea.disabled).toEqual(args.disabled);
  },
};

export const Autosize: Story = {
  args: {
    autosize: true,
  },
};
