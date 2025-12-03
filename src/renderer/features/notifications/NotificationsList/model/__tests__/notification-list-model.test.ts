import { fork } from 'effector';

import { type Notification, NotificationType } from '@/shared/core';
import { notificationModel } from '@/entities/notification';
import { notificationListModel } from '../notification-list-model';

describe('features/notifications/NotificationList/notification-list-model', () => {
  test('should group and sort $notificationGroups', async () => {
    const mockNotifications: Notification[] = [
      {
        id: 1,
        dateCreated: 1706400223615,
        type: NotificationType.MULTISIG_OPERATION,
        read: false,
        title: 'Test 1',
      } as Notification, // 28-01-2024 03:03 -> 2nd
      {
        id: 2,
        dateCreated: 1706401223615,
        type: NotificationType.MULTISIG_OPERATION,
        read: false,
        title: 'Test 2',
      } as Notification, // 28-01-2024 03:20 -> 1st
      {
        id: 3,
        dateCreated: 1706601223615,
        type: NotificationType.MULTISIG_OPERATION,
        read: false,
        title: 'Test 3',
      } as Notification, // 30-01-2024 10:53 -> 2nd
      {
        id: 4,
        dateCreated: 1706608223615,
        type: NotificationType.MULTISIG_OPERATION,
        read: false,
        title: 'Test 4',
      } as Notification, // 30-01-2024 12:50 -> 1st
    ];

    const scope = fork({
      values: new Map().set(notificationModel.$notifications, mockNotifications),
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
