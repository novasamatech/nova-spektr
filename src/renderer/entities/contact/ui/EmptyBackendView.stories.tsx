import { type Meta, type StoryObj } from '@storybook/react-vite';

import { EmptyBackendView } from './EmptyBackendView';

const meta: Meta<typeof EmptyBackendView> = {
  title: 'Address Book/EmptyBackendView',
  component: EmptyBackendView,
};

export default meta;

type Story = StoryObj<typeof EmptyBackendView>;

export const Default: Story = {};
