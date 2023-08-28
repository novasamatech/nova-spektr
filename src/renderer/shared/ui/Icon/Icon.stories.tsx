import type { Meta, StoryObj } from '@storybook/react';

import { withVersion } from '@renderer/shared/lib/utils/storybook';
import { Icon } from './Icon';

const meta: Meta<typeof Icon> = {
  title: 'Design system/Icon',
  component: Icon,
  decorators: [withVersion('1.0.0')],
};

export default meta;
type Story = StoryObj<typeof Icon>;

export const Image: Story = {
  args: {
    as: 'img',
    size: 16,
    name: 'learn-more',
  },
};

export const Svg: Story = {
  args: {
    as: 'svg',
    size: 32,
    name: 'upload-file',
    className: 'hover:text-red-500',
  },
};
