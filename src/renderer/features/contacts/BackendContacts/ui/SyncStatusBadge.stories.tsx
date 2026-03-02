import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withEffector } from '../../__stories__/withEffector';
import { backendContactsModel } from '../model/backend-contacts-model';

import { SyncStatusBadge } from './SyncStatusBadge';

const meta: Meta<typeof SyncStatusBadge> = {
  title: 'Address Book/SyncStatusBadge',
  component: SyncStatusBadge,
};

export default meta;

type Story = StoryObj<typeof SyncStatusBadge>;

export const Idle: Story = {
  decorators: [
    withEffector([
      [backendContactsModel.$syncStatus, 'idle'],
      [backendContactsModel.$lastSyncTime, null],
      [backendContactsModel.$isLoading, false],
    ]),
  ],
};

export const Syncing: Story = {
  decorators: [
    withEffector([
      [backendContactsModel.$syncStatus, 'syncing'],
      [backendContactsModel.$lastSyncTime, null],
      [backendContactsModel.$isLoading, true],
    ]),
  ],
};

export const SyncedJustNow: Story = {
  decorators: [
    withEffector([
      [backendContactsModel.$syncStatus, 'done'],
      [backendContactsModel.$lastSyncTime, Date.now()],
      [backendContactsModel.$isLoading, false],
    ]),
  ],
};

export const SyncedMinutesAgo: Story = {
  decorators: [
    withEffector([
      [backendContactsModel.$syncStatus, 'done'],
      [backendContactsModel.$lastSyncTime, Date.now() - 15 * 60 * 1000],
      [backendContactsModel.$isLoading, false],
    ]),
  ],
};

export const Error: Story = {
  decorators: [
    withEffector([
      [backendContactsModel.$syncStatus, 'error'],
      [backendContactsModel.$lastSyncTime, null],
      [backendContactsModel.$isLoading, false],
      [backendContactsModel.$error, 'Connection timeout'],
    ]),
  ],
};
