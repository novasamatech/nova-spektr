import { useUnit } from 'effector-react';
import orderBy from 'lodash/orderBy';
import { type PropsWithChildren, useState } from 'react';

import { Slot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { useDeferredList } from '@/shared/lib/hooks';
import { nonNullable, performSearch, toAddress, truncate } from '@/shared/lib/utils';
import { Button, Duration, EmptyList, FootnoteText, HelpText } from '@/shared/ui';
import { Account } from '@/shared/ui-entities';
import { Modal, SearchInput, Select } from '@/shared/ui-kit';
import { identityService } from '@/domains/network';
import { ChainTitle } from '@/entities/chain';
import { fellowshipActivityFeedFeature } from '../model/feature';
import { identityModel } from '../model/identity';
import { activityFeed } from '../model/list';

import { activityFeedRecordDescriptionSlot } from './ActivityList';
import { ActivityPlaceholder } from './ActivityPlaceholder';

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
  const clearSearch = () => setQuery('');
  const [orderKey, setOrderKey] = useState<OrderKey | null>(null);

  const records = list.map(record => {
    const identity = identities[record.accountId];
    return {
      ...record,
      address: toAddress(record.accountId, { prefix: input?.chain.addressPrefix }),
      name: identity ? identityService.getFullName(identity) : undefined,
      duration: (now - record.at.getTime()) / 1000,
    };
  });

  const filteredList = performSearch({
    records,
    query,
    queryMinLength: 3,
    weights: {
      type: 0.5,
      wish: 0.5,
      name: 1,
      accountId: 1,
      address: 1,
    },
  });

  const isNothingFound = !!records.length && !filteredList.length;

  const orderVariant = orderKey ? orderVariants[orderKey] : null;

  const sortedList = orderVariant ? orderBy(filteredList, orderVariant.field, orderVariant.direction) : filteredList;

  return (
    <Modal size="md" height="lg">
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Title close>
        <div className="flex gap-2">
          <span>{t('fellowship.activityFeed.activityModal.title')}</span>

          {input && <ChainTitle chainId={input.chainId} fontClass="text-text-primary text-header-title font-bold" />}
        </div>
      </Modal.Title>
      <Modal.HeaderContent>
        <div className="flex gap-x-4 px-5">
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
        <div className="h-full py-4">
          {isLoading && Array.from({ length: 5 }).map((_, i) => <ActivityPlaceholder key={i} />)}

          {isNothingFound && (
            <EmptyList
              title={t('fellowship.activityFeed.activityModal.nothing-found.title')}
              message={t('fellowship.activityFeed.activityModal.nothing-found.description', {
                query: truncate(query, 5, 5),
              })}
            >
              <Button pallet="primary" variant="text" onClick={clearSearch}>
                {t('fellowship.activityFeed.activityModal.nothing-found.clear')}
              </Button>
            </EmptyList>
          )}

          {sortedList.map(record => (
            <div key={`${record.block}-${record.accountId}-${record.type}`} className="flex flex-col gap-1 px-5 pt-2">
              <div className="flex items-center gap-2">
                <div className="min-w-0 grow text-button-small">
                  {nonNullable(input?.chain) && (
                    <Account accountId={record.accountId} chain={input.chain} title={record.name} hideAddress />
                  )}
                </div>
                <HelpText className="max-w-[40%] shrink-0 text-end text-text-secondary">
                  <Duration seconds={record.duration} shortFormat />
                </HelpText>
              </div>
              <FootnoteText className="text-text-secondary">
                <Slot id={activityFeedRecordDescriptionSlot} props={{ t, record }} />
              </FootnoteText>
            </div>
          ))}
        </div>
      </Modal.Content>
    </Modal>
  );
};
