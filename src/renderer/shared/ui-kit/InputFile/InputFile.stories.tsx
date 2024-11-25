import { type Meta, type StoryObj } from '@storybook/react';
import { expect, userEvent, within } from '@storybook/test';

import { InputFile } from './InputFile';

const meta: Meta<typeof InputFile> = {
  title: 'Design System/kit/InputFile',
  component: InputFile,
  args: {
    placeholder: 'Upload file',
  },
};

export default meta;

type Story = StoryObj<typeof InputFile>;

export const Default: Story = {};

export const WithFile: Story = {
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const fileInput = await canvas.findByTestId<HTMLInputElement>('file-input');
    const file = new File(['file content'], 'example.txt', { type: 'text/plain' });
    await userEvent.upload(fileInput, file);

    if (!fileInput.files) throw new Error('No files were uploaded');

    const uploadedFile = fileInput.files[0];
    if (!uploadedFile) throw new Error('No file at index 0');

    expect(fileInput.files).toHaveLength(1);
    expect(uploadedFile).toStrictEqual(file);
    expect(uploadedFile.name).toBe('example.txt');
    expect(uploadedFile.type).toBe('text/plain');
  },
};

export const Invalid: Story = {
  args: {
    invalid: true,
  },

  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const Input = await canvas.findByTestId<HTMLInputElement>('file-input');
    expect(Input.parentElement).toHaveClass('border-filter-border-negative');
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },

  async play({ args, canvasElement }) {
    const canvas = within(canvasElement);
    const Input = await canvas.findByTestId<HTMLInputElement>('file-input');
    expect(Input.disabled).toEqual(args.disabled);
  },
};
