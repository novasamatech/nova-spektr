import type { Meta, StoryObj } from '@storybook/react';

import { withVersion } from '@renderer/shared/lib/utils/storybook';
import { InputFile } from './InputFile';

const meta: Meta<typeof InputFile> = {
  title: 'Design system/Inputs/InputFile',
  component: InputFile,
  decorators: [withVersion('1.0.0')],
};

export default meta;
type Story = StoryObj<typeof InputFile>;

export const Playground: Story = {
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
