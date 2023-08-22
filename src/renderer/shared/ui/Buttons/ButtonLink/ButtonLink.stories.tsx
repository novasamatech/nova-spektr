import { MemoryRouter } from 'react-router-dom';
import type { Meta, StoryObj } from '@storybook/react';

import { ButtonLink } from './ButtonLink';

const meta: Meta<typeof ButtonLink> = {
  title: 'ui/Buttons/ButtonLink',
  component: ButtonLink,

  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ButtonLink>;

export const Primary: Story = {
  args: {
    to: 'test_path',
    children: 'Link',
    className: 'w-[200px]',
    disabled: false,
  },
};

export const Prefix: Story = {
  args: {
    to: 'test_path',
    children: 'Link',
    className: 'w-[200px]',
    disabled: false,
    icon: 'chat',
  },
};

export const Medium: Story = {
  args: {
    to: 'test_path',
    children: 'Link',
    className: 'w-[200px]',
    disabled: false,
    size: 'md',
    icon: 'chat',
  },
};

export const Small: Story = {
  args: {
    to: 'test_path',
    children: 'Link',
    className: 'w-[200px]',
    disabled: false,
    size: 'sm',
    icon: 'chat',
  },
};
