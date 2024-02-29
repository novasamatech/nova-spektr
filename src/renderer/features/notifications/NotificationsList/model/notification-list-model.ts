import { combine } from 'effector';
import groupBy from 'lodash/groupBy';
import orderBy from 'lodash/orderBy';
import { format } from 'date-fns';
import { enGB } from 'date-fns/locale';

import { notificationModel } from '@entities/notification';

const $notificationGroups = combine(notificationModel.$notifications, (notifications) => {
  if (notifications.length === 0) return [];

  const sorted = orderBy(notifications, ['dateCreated'], 'desc');

  const group = groupBy(sorted, ({ dateCreated }) => {
    return format(new Date(dateCreated || 0), 'PP', { locale: enGB });
  });

  return Object.entries(group);
});

export const notificationListModel = {
  $notificationGroups,
};
