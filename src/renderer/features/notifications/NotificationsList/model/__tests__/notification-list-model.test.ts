import { allSettled, fork } from 'effector';

import { notificationModel } from '@/entities/notification';
import { notificationListModel } from '../notification-list-model';

describe('features/notifications/NotificationList/notification-list-model', () => {
  test('should group and sort $notificationGroups', async () => {
    const mockNotifications = [
      { id: 1, dateCreated: 1706400223615 }, // 28-01-2024 03:03 -> 2nd
      { id: 2, dateCreated: 1706401223615 }, // 28-01-2024 03:20 -> 1st
      { id: 3, dateCreated: 1706601223615 }, // 30-01-2024 10:53 -> 2nd
      { id: 4, dateCreated: 1706608223615 }, // 30-01-2024 12:50 -> 1st
    ];

    const scope = fork();

    await allSettled(notificationModel.$notifications, { scope, params: mockNotifications });

    expect(scope.getState(notificationListModel.$notificationGroups)).toEqual([
      ['30 Jan 2024', [mockNotifications[3], mockNotifications[2]]],
      ['28 Jan 2024', [mockNotifications[1], mockNotifications[0]]],
    ]);
  });
});
