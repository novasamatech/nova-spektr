import { type Decorator } from '@storybook/react-vite';
import { type Store, type StoreWritable, fork } from 'effector';
import { Provider } from 'effector-react';

import { TEST_ACCOUNTS } from '@/shared/lib/utils';
import { authModel, backendConfigurationModel } from '@/features/contacts';

import { BackendSyncSettings } from './BackendSyncSettings';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function withEffector(values: [Store<any>, any][]): Decorator {
  return (Story) => {
    // Filter out derived stores (.map / combine) — fork() only accepts writable stores
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const writableValues = values.filter(([store]) => !(store as any).derived) as [StoreWritable<any>, any][];

    const scope = fork({ values: writableValues });

    return (
      <Provider value={scope}>
        <Story />
      </Provider>
    );
  };
}

const meta = {
  title: 'Address Book/BackendSyncSettings',
  component: BackendSyncSettings,
};

export default meta;

export const ConfiguredConnected = {
  decorators: [
    withEffector([
      [backendConfigurationModel.$backendUrl, 'https://contacts.novasama.io/api'],
      [authModel.$authState, { accountId: TEST_ACCOUNTS[0], accountName: 'Alice', permissions: ['read'] }],
    ]),
  ],
};

export const ConfiguredDisconnected = {
  decorators: [
    withEffector([
      [backendConfigurationModel.$backendUrl, 'https://contacts.novasama.io/api'],
      [authModel.$authState, null],
    ]),
  ],
};

export const NotConfigured = {
  decorators: [
    withEffector([
      [backendConfigurationModel.$backendUrl, null],
      [authModel.$authState, null],
    ]),
  ],
};
