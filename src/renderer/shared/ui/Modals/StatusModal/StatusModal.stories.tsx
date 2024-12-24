import { type Meta, type StoryObj } from '@storybook/react';

import { Animation } from '../../Animation/Animation';
import { Button } from '../../Buttons';

import { StatusModal } from './StatusModal';

const meta: Meta<typeof StatusModal> = {
  title: 'v1/ui/StatusModal',
  component: StatusModal,
  parameters: { actions: { argTypesRegex: '^on.*' } },
};

export default meta;

type Story = StoryObj<typeof StatusModal>;

export const Default: Story = {
  args: {
    isOpen: true,
    title: 'Status modal example',
    onClose: () => {},
  },
};

export const WithContent: Story = {
  args: {
    isOpen: true,
    title: 'Status modal example',
    content: <Animation variant="loading" loop />,
    onClose: () => {},
  },
};

export const WithFooter: Story = {
  args: {
    isOpen: true,
    title: 'Status modal example',
    children: (
      <>
        <Button className="flex-1" variant="fill" pallet="secondary" size="sm">
          Cancel
        </Button>
        <Button className="flex-1" variant="fill" size="sm" pallet="primary">
          Confirm
        </Button>
      </>
    ),
    onClose: () => {},
  },
};
