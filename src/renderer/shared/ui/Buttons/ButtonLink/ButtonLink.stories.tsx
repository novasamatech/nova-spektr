import { MemoryRouter } from 'react-router-dom';
import type { Meta, StoryObj } from '@storybook/react';

import { ButtonLink } from './ButtonLink';

const meta: Meta<typeof ButtonLink> = {
  title: 'Design system/Buttons/ButtonLink',
  component: ButtonLink,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div className="flex flex-col gap-y-4 items-center">
          <h1>Version - 1.0.0</h1>
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ButtonLink>;

const UiOptions: Story['argTypes'] = {
  icon: {
    options: [undefined, 'new-tab', 'chat', 'learn-more'],
  },
  className: { control: false },
};

export const Playground: Story = {
  args: {
    to: 'test_path',
    children: 'Inner Link',
    size: 'md',
  },
  argTypes: UiOptions,
};

export const External: Story = {
  render: () => (
    <ButtonLink remote icon="new-tab" to="https://novaspektr.io/">
      Visit NovaSpektr
    </ButtonLink>
  ),
};

export const Disabled: Story = {
  render: () => (
    <ButtonLink disabled remote icon="learn-more" to="https://novawallet.io/">
      Visit NovaWallet
    </ButtonLink>
  ),
};
