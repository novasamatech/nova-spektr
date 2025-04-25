import { useUnit } from 'effector-react';
import orderBy from 'lodash/orderBy';
import { type PropsWithChildren, useDeferredValue, useMemo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { useDeferredList } from '@/shared/lib/hooks';
import { nullable, performSearch, toAddress, truncate } from '@/shared/lib/utils';
import { Button, EmptyList } from '@/shared/ui';
import { Modal, SearchInput, Select } from '@/shared/ui-kit';
import { identityService } from '@/domains/network';
import { fellowshipActivityFeedFeature } from '../model/feature';
import { identityModel } from '../model/identity';
import { activityFeed } from '../model/list';

import { ActivityPlaceholder } from './ActivityPlaceholder';
import { EventRecord } from './EventRecord';

type OrderKey = 'duration-asc' | 'duration-desc' | 'name-asc' | 'name-desc';

const orderVariants: Record<OrderKey, { field: string; direction: 'asc' | 'desc' }> = {
  'duration-asc': { field: 'duration', direction: 'asc' },
  'duration-desc': { field: 'duration', direction: 'desc' },
  'name-asc': { field: 'name', direction: 'asc' },
  'name-desc': { field: 'name', direction: 'desc' },
};

const now = Date.now();

export const ActivityModal = ({ children }: PropsWithChildren) => {
  const { t } = useI18n();

  const input = useUnit(fellowshipActivityFeedFeature.input);
  const feed = useUnit(activityFeed.$activityFeed);
  const { list, isLoading } = useDeferredList({ list: feed, isLoading: feed.length === 0 });

  const identities = useUnit(identityModel.$list);

  const [query, setQuery] = useState('');
  const [orderKey, setOrderKey] = useState<OrderKey>('duration-asc');

  const deferredQuery = useDeferredValue(query);

  const clearSearch = () => setQuery('');

  const records = useMemo(
    () =>
      list.map(record => {
        const identity = identities[record.accountId];
        return {
          ...record,
          address: toAddress(record.accountId, { prefix: input?.chain.addressPrefix }),
          name: identity ? identityService.getFullName(identity) : undefined,
          duration: (now - record.at.getTime()) / 1000,
        };
      }),
    [identities, list],
  );

  const filteredList = useMemo(() => {
    return performSearch({
      query: deferredQuery,
      queryMinLength: 2,
      records,
      weights: {
        type: 0.5,
        name: 1,
        wish: 0.5,
        accountId: 0.5,
        address: 0.5,
      },
    });
  }, [deferredQuery, records]);

  const isNothingFound = !!records.length && !filteredList.length;
  const orderVariant = orderKey ? orderVariants[orderKey] : null;

  const sortedList = useMemo(
    () => (orderVariant ? orderBy(filteredList, orderVariant.field, orderVariant.direction) : filteredList),
    [filteredList, orderVariant],
  );

  if (nullable(input)) return children;

  return (
    <Modal size="md" height="lg">
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Title close>{t('fellowship.activityFeed.activityModal.title')}</Modal.Title>
      <Modal.HeaderContent>
        <div className="flex gap-x-2 bg-main-app-background px-5 py-4">
          <div className="inline grow">
            <SearchInput
              placeholder={t('fellowship.activityFeed.activityModal.search-placeholder')}
              value={query}
              onChange={setQuery}
            />
          </div>

          <div className="w-[150px]">
            <Select
              placeholder={t('fellowship.activityFeed.activityModal.sort.placeholder')}
              value={orderKey}
              onChange={setOrderKey}
            >
              <Select.Item value="duration-asc">
                {t('fellowship.activityFeed.activityModal.sort.duration-asc')}
              </Select.Item>
              <Select.Item value="duration-desc">
                {t('fellowship.activityFeed.activityModal.sort.duration-desc')}
              </Select.Item>
              <Select.Item value="name-asc">{t('fellowship.activityFeed.activityModal.sort.name-asc')}</Select.Item>
              <Select.Item value="name-desc">{t('fellowship.activityFeed.activityModal.sort.name-desc')}</Select.Item>
            </Select>
          </div>
        </div>
      </Modal.HeaderContent>
      <Modal.Content>
        <div className="flex h-full flex-col gap-y-5 bg-main-app-background pb-4 pt-2">
          {isLoading && Array.from({ length: 5 }).map((_, i) => <ActivityPlaceholder key={i} />)}

          {isNothingFound && (
            <EmptyList
              title={t('fellowship.activityFeed.activityModal.nothing-found.title')}
              message={t('fellowship.activityFeed.activityModal.nothing-found.description', {
                query: truncate(query, 6, 6),
              })}
            >
              <Button pallet="primary" variant="text" onClick={clearSearch}>
                {t('fellowship.activityFeed.activityModal.nothing-found.clear')}
              </Button>
            </EmptyList>
          )}

          {sortedList.map(event => (
            <EventRecord key={`${event.block}-${event.accountId}-${event.type}`} event={event} chain={input.chain} />
          ))}
        </div>
      </Modal.Content>
    </Modal>
  );
};
