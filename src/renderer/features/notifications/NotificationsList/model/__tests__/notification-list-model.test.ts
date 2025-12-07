import { fork } from 'effector';

import { type CallHash, type ChainId, type Notification, NotificationType } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { accounts } from '@/domains/network';
import { notificationModel } from '@/entities/notification';
import { walletModel } from '@/entities/wallet';
import { NotificationEvent, notificationsSettingsModel } from '../../../NotificationsSettings';
import { notificationListModel } from '../notification-list-model';

describe('features/notifications/NotificationList/notification-list-model', () => {
  test('should group and sort $notificationGroups', async () => {
    const testAccountId = '0x1234567890abcdef' as AccountId;
    const testWalletId = 1;

    const mockNotifications: Notification[] = [
      {
        id: 1,
        key: 'notif-1',
        dateCreated: 1706400223615,
        type: NotificationType.MULTISIG_OPERATION,
        read: false,
        title: 'Test 1',
        status: 'info',
        issuer: testAccountId,
        chainId: '0x1' as ChainId,
        multisigAccountId: '0xabcd' as AccountId,
        callHash: '0xhash1' as CallHash,
        callTimepoint: { height: 100, index: 0 },
        operationId: 'op1',
      } as Notification, // 28-01-2024 03:03 -> 2nd
      {
        id: 2,
        key: 'notif-2',
        dateCreated: 1706401223615,
        type: NotificationType.MULTISIG_OPERATION,
        read: false,
        title: 'Test 2',
        status: 'info',
        issuer: testAccountId,
        chainId: '0x1' as ChainId,
        multisigAccountId: '0xabcd' as AccountId,
        callHash: '0xhash2' as CallHash,
        callTimepoint: { height: 101, index: 0 },
        operationId: 'op2',
      } as Notification, // 28-01-2024 03:20 -> 1st
      {
        id: 3,
        key: 'notif-3',
        dateCreated: 1706601223615,
        type: NotificationType.MULTISIG_OPERATION,
        read: false,
        title: 'Test 3',
        status: 'info',
        issuer: testAccountId,
        chainId: '0x1' as ChainId,
        multisigAccountId: '0xabcd' as AccountId,
        callHash: '0xhash3' as CallHash,
        callTimepoint: { height: 102, index: 0 },
        operationId: 'op3',
      } as Notification, // 30-01-2024 10:53 -> 2nd
      {
        id: 4,
        key: 'notif-4',
        dateCreated: 1706608223615,
        type: NotificationType.MULTISIG_OPERATION,
        read: false,
        title: 'Test 4',
        status: 'info',
        issuer: testAccountId,
        chainId: '0x1' as ChainId,
        multisigAccountId: '0xabcd' as AccountId,
        callHash: '0xhash4' as CallHash,
        callTimepoint: { height: 103, index: 0 },
        operationId: 'op4',
      } as Notification, // 30-01-2024 12:50 -> 1st
    ];

    const mockWallets = [
      {
        id: testWalletId,
        name: 'Test Wallet',
      },
    ];

    const mockAccounts = [
      {
        accountId: testAccountId,
        name: 'Test Account',
        walletId: testWalletId,
      },
    ] as any;

    const scope = fork({
      values: new Map()
        .set(notificationModel.$notifications, mockNotifications)
        .set(walletModel.__test.$rawWallets, mockWallets)
        .set(accounts.__test.$list, mockAccounts)
        .set(notificationsSettingsModel.$selectedWalletIds, new Set([testWalletId]))
        .set(
          notificationsSettingsModel.$notificationEvents,
          new Set([
            NotificationEvent.WALLET_CREATED,
            NotificationEvent.OPERATION_CREATED,
            NotificationEvent.OPERATION_EXECUTED,
            NotificationEvent.OPERATION_REJECTED,
          ]),
        ),
    });

    const result = scope.getState(notificationListModel.$notificationGroups);

    expect(result).toHaveLength(2);
    expect(result[0][0]).toBe('30 Jan 2024');
    expect(result[0][1]).toHaveLength(2);
    expect(result[0][1][0]).toMatchObject({ id: 4, dateCreated: 1706608223615 });
    expect(result[0][1][1]).toMatchObject({ id: 3, dateCreated: 1706601223615 });
    expect(result[1][0]).toBe('28 Jan 2024');
    expect(result[1][1]).toHaveLength(2);
    expect(result[1][1][0]).toMatchObject({ id: 2, dateCreated: 1706401223615 });
    expect(result[1][1][1]).toMatchObject({ id: 1, dateCreated: 1706400223615 });
  });
});
