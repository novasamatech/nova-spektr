import { type Meta, type StoryObj } from '@storybook/react';

import { BasketOperationStatus } from './BasketOperationStatus';

const meta: Meta<typeof BasketOperationStatus> = {
  title: 'Design System/entities/BasketOperationStatus',
  component: BasketOperationStatus,
  args: {
    validating: false,
  },
};

export default meta;

type Story = StoryObj<typeof BasketOperationStatus>;

export const Default: Story = {
  decorators: [
    Story => {
      return (
        <div className="w-20 resize-x overflow-hidden">
          <Story />
        </div>
      );
    },
  ],
};

export const Validating: Story = {
  args: {
    validating: true,
  },
};

export const WithSimpleError: Story = {
  args: {
    errorText: 'error',
  },
};

export const WithChainError: Story = {
  args: {
    error: {
      type: 'chain',
      message: 'chain error',
      dateCreated: 100000000,
    },
  },
};

export const WithClientError: Story = {
  args: {
    error: {
      type: 'client',
      message: 'chain error',
      args: {},
    },
  },
};
