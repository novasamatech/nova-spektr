import { combine } from 'effector';
import groupBy from 'lodash/groupBy';
import { format } from 'date-fns';
import { enGB } from 'date-fns/locale';

import { notificationModel } from '@entities/notification';
import { sortByDateDesc } from '@shared/lib/utils';

const $notificationGroups = combine(notificationModel.$notifications, (notifications) => {
  if (notifications.length === 0) return [];

  const group = groupBy(notifications, ({ dateCreated }) => {
    return format(new Date(dateCreated || 0), 'PP', { locale: enGB });
  });

  return Object.entries(group).sort(sortByDateDesc);
});

export const notificationListModel = {
  $notificationGroups,
};
