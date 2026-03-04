import { type Meta, type StoryObj } from '@storybook/react-vite';

import { TEST_ACCOUNTS } from '@/shared/lib/utils';
import { ConfirmDialogProvider } from '@/shared/providers/ConfirmContext';
import { withEffector } from '../../__stories__/withEffector';
import { authModel } from '../model/auth-model';
import { backendConfigurationModel } from '../model/backend-configuration-model';

import { BackendConfigurationModal } from './BackendConfigurationModal';

const meta: Meta<typeof BackendConfigurationModal> = {
  title: 'Address Book/BackendConfigurationModal',
  component: BackendConfigurationModal,
  decorators: [
    (Story) => (
      <ConfirmDialogProvider>
        <Story />
      </ConfirmDialogProvider>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof BackendConfigurationModal>;

export const EmptyInput: Story = {
  decorators: [
    withEffector([
      [backendConfigurationModel.$isModalOpen, true],
      [backendConfigurationModel.$draftUrl, ''],
      [backendConfigurationModel.$backendUrl, null],
      [backendConfigurationModel.$urlReachable, null],
      [authModel.$authState, null],
      [authModel.$authStep, 'selectAccount'],
      [authModel.$selectedAccountId, null],
      [authModel.$error, null],
    ]),
  ],
};

export const UrlChecking: Story = {
  decorators: [
    withEffector([
      [backendConfigurationModel.$isModalOpen, true],
      [backendConfigurationModel.$draftUrl, 'https://contacts.novasama.io/api'],
      [backendConfigurationModel.$backendUrl, null],
      [backendConfigurationModel.$urlReachable, 'checking'],
      [authModel.$authState, null],
      [authModel.$authStep, 'selectAccount'],
      [authModel.$selectedAccountId, TEST_ACCOUNTS[0]],
      [authModel.$error, null],
    ]),
  ],
};

export const UrlReachable: Story = {
  decorators: [
    withEffector([
      [backendConfigurationModel.$isModalOpen, true],
      [backendConfigurationModel.$draftUrl, 'https://contacts.novasama.io/api'],
      [backendConfigurationModel.$backendUrl, null],
      [backendConfigurationModel.$urlReachable, 'reachable'],
      [authModel.$authState, null],
      [authModel.$authStep, 'selectAccount'],
      [authModel.$selectedAccountId, TEST_ACCOUNTS[0]],
      [authModel.$error, null],
    ]),
  ],
};

export const UrlUnreachable: Story = {
  decorators: [
    withEffector([
      [backendConfigurationModel.$isModalOpen, true],
      [backendConfigurationModel.$draftUrl, 'https://invalid-server.example.com'],
      [backendConfigurationModel.$backendUrl, null],
      [backendConfigurationModel.$urlReachable, 'unreachable'],
      [authModel.$authState, null],
      [authModel.$authStep, 'selectAccount'],
      [authModel.$selectedAccountId, TEST_ACCOUNTS[0]],
      [authModel.$error, null],
    ]),
  ],
};

export const ConnectedState: Story = {
  decorators: [
    withEffector([
      [backendConfigurationModel.$isModalOpen, true],
      [backendConfigurationModel.$draftUrl, 'https://contacts.novasama.io/api'],
      [backendConfigurationModel.$backendUrl, 'https://contacts.novasama.io/api'],
      [backendConfigurationModel.$urlReachable, 'reachable'],
      [authModel.$authState, { accountId: TEST_ACCOUNTS[0], accountName: 'Alice', permissions: ['read'] }],
      [authModel.$authStep, 'selectAccount'],
      [authModel.$selectedAccountId, TEST_ACCOUNTS[0]],
      [authModel.$error, null],
    ]),
  ],
};

export const SigningState: Story = {
  decorators: [
    withEffector([
      [backendConfigurationModel.$isModalOpen, true],
      [backendConfigurationModel.$draftUrl, 'https://contacts.novasama.io/api'],
      [backendConfigurationModel.$backendUrl, null],
      [backendConfigurationModel.$urlReachable, 'reachable'],
      [authModel.$authState, null],
      [authModel.$authStep, 'signing'],
      [authModel.$selectedAccountId, TEST_ACCOUNTS[0]],
      [authModel.$error, null],
    ]),
  ],
};

export const ErrorState: Story = {
  decorators: [
    withEffector([
      [backendConfigurationModel.$isModalOpen, true],
      [backendConfigurationModel.$draftUrl, 'https://contacts.novasama.io/api'],
      [backendConfigurationModel.$backendUrl, null],
      [backendConfigurationModel.$urlReachable, 'reachable'],
      [authModel.$authState, null],
      [authModel.$authStep, 'error'],
      [authModel.$selectedAccountId, TEST_ACCOUNTS[0]],
      [authModel.$error, 'User cancelled signing request'],
    ]),
  ],
};
