import { type Meta, type StoryObj } from '@storybook/react-vite';

import { TEST_ACCOUNTS } from '@/shared/lib/utils';
import { authModel, backendConfigurationModel } from '@/aggregates/backend-auth';
import { withEffector } from '../../__stories__/withEffector';

import { BackendConnectionCard } from './BackendConnectionCard';

const meta: Meta<typeof BackendConnectionCard> = {
  title: 'Address Book/BackendConnectionCard',
  component: BackendConnectionCard,
};

export default meta;

type Story = StoryObj<typeof BackendConnectionCard>;

export const Connected: Story = {
  decorators: [
    withEffector([
      [backendConfigurationModel.$backendUrl, 'https://contacts.novasama.io/api'],
      [authModel.$authState, { accountId: TEST_ACCOUNTS[0], accountName: 'Alice', permissions: ['read'] }],
      [authModel.$isSessionExpired, false],
    ]),
  ],
};

export const Disconnected: Story = {
  decorators: [
    withEffector([
      [backendConfigurationModel.$backendUrl, 'https://contacts.novasama.io/api'],
      [authModel.$authState, null],
      [authModel.$isSessionExpired, false],
    ]),
  ],
};

export const SessionExpired: Story = {
  decorators: [
    withEffector([
      [backendConfigurationModel.$backendUrl, 'https://contacts.novasama.io/api'],
      [authModel.$authState, { accountId: TEST_ACCOUNTS[0], accountName: 'Alice', permissions: ['read'] }],
      [authModel.$isSessionExpired, true],
    ]),
  ],
};
