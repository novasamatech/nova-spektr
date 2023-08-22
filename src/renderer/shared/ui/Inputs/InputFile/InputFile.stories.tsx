import type { Meta, StoryObj } from '@storybook/react';

import { InputFile } from './InputFile';

const meta: Meta<typeof InputFile> = {
  title: 'InputFile',
  component: InputFile,
};

export default meta;
type Story = StoryObj<typeof InputFile>;

export const Primary: Story = {
  args: {
    placeholder: 'Upload file',
  },
};

export const Invalid: Story = {
  args: {
    placeholder: 'Upload file',
    invalid: true,
  },
};

export const Disabled: Story = {
  args: {
    placeholder: 'Upload file',
    disabled: true,
  },
};
