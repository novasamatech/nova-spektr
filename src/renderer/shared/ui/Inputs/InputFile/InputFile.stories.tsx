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

export const Disabled: Story = {
  render: () => <InputFile placeholder="Upload file" disabled />,
};

export const Invalid: Story = {
  render: () => <InputFile placeholder="Upload file" invalid />,
};
