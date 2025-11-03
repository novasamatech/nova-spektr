import { orderBy } from 'lodash';
import { type PropsWithChildren, useDeferredValue, useMemo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { nullable, performSearch, truncate } from '@/shared/lib/utils';
import { Button, EmptyList } from '@/shared/ui';
import { Modal, SearchInput, Select } from '@/shared/ui-kit';
import { useFeed } from '@/domains/collectives';
import { identityService, useIdentities } from '@/domains/network';
import { useFellowshipChain } from '@/aggregates/fellowship-network';

import { ActivityListView } from './ActivityListView';
import { getDescription } from './utils';

type OrderKey = 'duration-asc' | 'duration-desc' | 'name-asc' | 'name-desc';

const orderVariants: Record<OrderKey, { field: string; direction: 'asc' | 'desc' }> = {
  'duration-asc': { field: 'duration', direction: 'asc' },
  'duration-desc': { field: 'duration', direction: 'desc' },
  'name-asc': { field: 'name', direction: 'asc' },
  'name-desc': { field: 'name', direction: 'desc' },
};

export const ActivityModal = ({ children }: PropsWithChildren) => {
  const { t } = useI18n();

  const chain = useFellowshipChain();
  const { data: feed } = useFeed({ palletType: 'fellowship', chain });
  const { data: identities } = useIdentities(
    feed.map(record => record.accountId),
    chain?.chainId,
  );

  const [query, setQuery] = useState('');
  const [orderKey, setOrderKey] = useState<OrderKey>('duration-asc');

  const deferredQuery = useDeferredValue(query);

  const clearSearch = () => setQuery('');

  const now = Date.now();

  const records = useMemo(
    () =>
      feed.map(record => {
        const identity = identities[record.accountId];
        return {
          ...record,
          name: identity ? identityService.getFullName(identity) : undefined,
          description: getDescription(record, t),
          duration: (now - record.at.getTime()) / 1000,
        };
      }),
    [identities, feed, t],
  );

  const filteredList = useMemo(() => {
    return performSearch({
      query: deferredQuery,
      queryMinLength: 2,
      records,
      weights: {
        name: 1,
        description: 0.75,
        address: 0.5,
        type: 0.5,
        wish: 0.5,
        accountId: 0.5,
      },
    });
  }, [deferredQuery, records]);

  const isNothingFound = !!records.length && !filteredList.length;

  const sortedList = useMemo(() => {
    const orderVariant = orderVariants[orderKey];
    return orderVariant ? orderBy(filteredList, orderVariant.field, orderVariant.direction) : filteredList;
  }, [filteredList, orderKey]);

  if (nullable(chain)) return children;

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
        <div className="bg-main-app-background">
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
          <ActivityListView limit={Number.POSITIVE_INFINITY} feed={sortedList} withFullAccountInfo />
        </div>
      </Modal.Content>
    </Modal>
  );
};
