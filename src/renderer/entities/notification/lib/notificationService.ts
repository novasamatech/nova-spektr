import { useLiveQuery } from 'dexie-react-hooks';

import storage, { NotificationDS } from '@renderer/services/storage';
import { INotificationService } from './common/types';
import { Notification } from '@renderer/entities/notification/model/notification';

export const useNotification = (): INotificationService => {
  const notificationStorage = storage.connectTo('notifications');

  if (!notificationStorage) {
    throw new Error('=== 🔴 Notification storage in not defined 🔴 ===');
  }
  const { getNotifications, addNotification } = notificationStorage;

  const getLiveNotifications = <T extends Notification>(where?: Partial<T>): NotificationDS[] => {
    const query = () => {
      try {
        return getNotifications(where);
      } catch (error) {
        console.warn('Error trying to get notifications');

        return Promise.resolve([]);
      }
    };

    return useLiveQuery(query, [], []);
  };

  return {
    getNotifications,
    getLiveNotifications,
    addNotification,
  };
};
