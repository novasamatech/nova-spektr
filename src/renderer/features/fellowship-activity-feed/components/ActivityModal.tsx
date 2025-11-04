import { orderBy } from 'lodash';
import { type PropsWithChildren, useDeferredValue, useMemo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { nullable, performSearch, truncate } from '@/shared/lib/utils';
import { Button, EmptyList } from '@/shared/ui';
import { Box, Modal, SearchInput, Select } from '@/shared/ui-kit';
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

const LIMIT_STEP = 100;

export const ActivityModal = ({ children }: PropsWithChildren) => {
  const { t } = useI18n();

  const chain = useFellowshipChain();
  const { data: feed, pending } = useFeed({ palletType: 'fellowship', chain });
  const { data: identities } = useIdentities(feed.map(record => record.accountId));

  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(LIMIT_STEP);
  const [orderKey, setOrderKey] = useState<OrderKey>('duration-asc');

  const deferredQuery = useDeferredValue(query);

  const records = useMemo(
    () =>
      feed.map(record => {
        const identity = identities[record.accountId];
        return {
          ...record,
          name: identity ? identityService.getFullName(identity) : undefined,
          description: getDescription(record, t),
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

  const shouldRenderMoreButton = limit < sortedList.length;

  if (nullable(chain)) return children;

  return (
    <Modal size="md" height="lg">
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Title close>{t('fellowship.activityFeed.activityModal.title')}</Modal.Title>
      <Modal.HeaderContent background="secondary">
        <div className="flex gap-x-2 px-5 py-4">
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
      <Modal.Content background="secondary">
        {isNothingFound && (
          <EmptyList
            title={t('fellowship.activityFeed.activityModal.nothing-found.title')}
            message={t('fellowship.activityFeed.activityModal.nothing-found.description', {
              query: truncate(query, 6, 6),
            })}
          >
            <Button pallet="primary" variant="text" onClick={() => setQuery('')}>
              {t('fellowship.activityFeed.activityModal.nothing-found.clear')}
            </Button>
          </EmptyList>
        )}
        <ActivityListView feed={sortedList} limit={limit} pending={pending} withFullAccountInfo />
        {shouldRenderMoreButton && (
          <Box padding={[0, 0, 5, 0]} horizontalAlign="center">
            <Button variant="text" size="sm" onClick={() => setLimit(l => l + LIMIT_STEP)}>
              {t('fellowship.activityFeed.activityModal.loadMore')}
            </Button>
          </Box>
        )}
      </Modal.Content>
    </Modal>
  );
};
