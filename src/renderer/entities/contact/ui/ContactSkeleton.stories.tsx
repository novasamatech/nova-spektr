import { type Meta, type StoryObj } from '@storybook/react-vite';

import { ContactSkeleton } from './ContactSkeleton';

const meta: Meta<typeof ContactSkeleton> = {
  title: 'Address Book/ContactSkeleton',
  component: ContactSkeleton,
};

export default meta;

type Story = StoryObj<typeof ContactSkeleton>;

export const Default: Story = {};
