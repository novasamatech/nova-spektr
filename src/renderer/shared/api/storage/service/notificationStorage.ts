import { Notification } from '@entities/notification';
import { ID, INotificationStorage, NotificationDS, TNotification } from '../lib/types';

export const useNotificationStorage = (db: TNotification): INotificationStorage => ({
  getNotifications: <T extends Notification>(where?: Partial<T>): Promise<NotificationDS[]> => {
    return where ? db.where(where).toArray() : db.toArray();
  },

  addNotification: (notification: Notification): Promise<ID> => {
    return db.add(notification);
  },
});
