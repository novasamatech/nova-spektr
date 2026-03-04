import { type Meta, type StoryObj } from '@storybook/react-vite';

import { BackendLoadingView } from './BackendLoadingView';

const meta: Meta<typeof BackendLoadingView> = {
  title: 'Address Book/BackendLoadingView',
  component: BackendLoadingView,
};

export default meta;

type Story = StoryObj<typeof BackendLoadingView>;

export const Default: Story = {};
