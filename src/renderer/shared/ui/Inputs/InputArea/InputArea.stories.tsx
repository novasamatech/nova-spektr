import type { Meta, StoryObj } from '@storybook/react';

import { InputArea } from './InputArea';

const meta: Meta<typeof InputArea> = {
  title: 'InputArea',
  component: InputArea,
};

export default meta;
type Story = StoryObj<typeof InputArea>;

export const Primary: Story = {
  args: {
    rows: 3,
    maxLength: 120,
    placeholder: 'Max length is 120',
  },
};

export const Filled: Story = {
  args: {
    rows: 2,
    value:
      'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Culpa doloribus iusto possimus praesentium ratione temporibus. Aperiam autem cumque esse eum fugit laborum quas! Architecto at, cupiditate dignissimos eveniet sunt voluptatibus.',
  },
};

export const Invalid: Story = {
  args: {
    rows: 1,
    value: 'This is value',
    invalid: true,
  },
};

export const Disabled: Story = {
  args: {
    rows: 1,
    value: 'This is value',
    disabled: true,
  },
};
