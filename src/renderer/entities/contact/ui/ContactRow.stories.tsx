import { type Meta, type StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';

import { type LocalContact } from '@/shared/core';
import { TEST_ACCOUNTS, TEST_ADDRESS } from '@/shared/lib/utils';

import { ContactRow } from './ContactRow';

const mockContact: LocalContact = {
  id: '1',
  name: 'Alice Validator',
  address: TEST_ADDRESS,
  accountId: TEST_ACCOUNTS[0],
  source: 'local',
};

const meta: Meta<typeof ContactRow> = {
  title: 'Address Book/ContactRow',
  component: ContactRow,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <ul>
          <Story />
        </ul>
      </MemoryRouter>
    ),
  ],
  args: {
    contact: mockContact,
    onSendTo: () => {},
  },
};

export default meta;

type Story = StoryObj<typeof ContactRow>;

export const Default: Story = {};
