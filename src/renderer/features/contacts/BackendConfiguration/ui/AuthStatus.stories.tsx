import { type Meta, type StoryObj } from '@storybook/react-vite';

import { TEST_ACCOUNTS } from '@/shared/lib/utils';
import { withEffector } from '../../__stories__/withEffector';
import { authModel } from '../model/auth-model';

import { AuthStatus } from './AuthStatus';

const meta: Meta<typeof AuthStatus> = {
  title: 'Address Book/AuthStatus',
  component: AuthStatus,
};

export default meta;

type Story = StoryObj<typeof AuthStatus>;

export const Connected: Story = {
  decorators: [
    withEffector([
      [authModel.$authState, { accountId: TEST_ACCOUNTS[0], accountName: 'Alice', permissions: ['read'] }],
      [authModel.$isSessionExpired, false],
    ]),
  ],
};

export const Disconnected: Story = {
  decorators: [
    withEffector([
      [authModel.$authState, null],
      [authModel.$isSessionExpired, false],
    ]),
  ],
};

export const SessionExpired: Story = {
  decorators: [
    withEffector([
      [authModel.$authState, { accountId: TEST_ACCOUNTS[0], accountName: 'Alice', permissions: ['read'] }],
      [authModel.$isSessionExpired, true],
    ]),
  ],
};
