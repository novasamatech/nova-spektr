import { ID, NotificationDS } from '@shared/api/storage';
import { Notification } from '@entities/notification/model/notification';

export interface INotificationService {
  getNotifications: <T extends Notification>(where?: Partial<T>) => Promise<NotificationDS[]>;
  getLiveNotifications: <T extends Notification>(where?: Partial<T>) => NotificationDS[];
  addNotification: (notification: Notification) => Promise<ID>;
}
