import { type ReactNode, Fragment } from 'react';

import { useI18n } from '@/shared/i18n';
import { groupByDate } from '@/shared/lib/utils';

import { DateGroupHeader } from './DateGroupHeader';

type Props<T> = {
  items: T[];
  getTimestamp: (item: T) => number;
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
};

export const GroupedList = <T,>({ items, getTimestamp, getKey, renderItem }: Props<T>) => {
  const { formatDate } = useI18n();
  const groups = groupByDate(items, getTimestamp);

  return (
    <>
      {groups.map((group, index) => (
        <Fragment key={group.dateKey}>
          <DateGroupHeader displayDate={formatDate(group.dateStart, 'PP')} first={index === 0} />
          {group.items.map((item) => (
            <Fragment key={getKey(item)}>{renderItem(item)}</Fragment>
          ))}
        </Fragment>
      ))}
    </>
  );
};
