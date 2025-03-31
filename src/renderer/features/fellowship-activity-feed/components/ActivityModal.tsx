import { useUnit } from 'effector-react';
import orderBy from 'lodash/orderBy';
import { type PropsWithChildren, useState } from 'react';

import { Slot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { useDeferredList } from '@/shared/lib/hooks';
import { nonNullable, performSearch, toAddress } from '@/shared/lib/utils';
import { BodyText, Duration, EmptyList, FootnoteText, HelpText } from '@/shared/ui';
import { Address } from '@/shared/ui-entities';
import { Modal, SearchInput, Select } from '@/shared/ui-kit';
import { identityService } from '@/domains/network';
import { ChainTitle } from '@/entities/chain';
import { fellowshipActivityFeedFeature } from '../model/feature';
import { identityModel } from '../model/identity';
import { activityFeed } from '../model/list';

import { activityFeedRecordDescriptionSlot } from './ActivityList';
import { ActivityPlaceholder } from './ActivityPlaceholder';

type OrderKey = 'date-asc' | 'date-desc';

const orderVariants: Record<OrderKey, { field: string; direction: 'asc' | 'desc' }> = {
  'date-asc': { field: 'at', direction: 'asc' },
  'date-desc': { field: 'at', direction: 'desc' },
};

export const ActivityModal = ({ children }: PropsWithChildren) => {
  const { t } = useI18n();

  const input = useUnit(fellowshipActivityFeedFeature.input);
  const feed = useUnit(activityFeed.$activityFeed);
  const { list, isLoading } = useDeferredList({ list: feed, isLoading: feed.length === 0 });

  const identities = useUnit(identityModel.$list);

  const [query, setQuery] = useState('');
  const [orderKey, setOrderKey] = useState<OrderKey | null>(null);

  const records = list.map(record => {
    const identity = identities[record.accountId];
    return { ...record, name: identity?.name };
  });

  const filteredList = performSearch({
    records,
    query,
    queryMinLength: 3,
    weights: {
      type: 0.5,
      wish: 0.5,
      name: 1,
    },
  });

  const isNothingFound = records.length && !filteredList.length;

  const orderVariant = orderKey ? orderVariants[orderKey] : null;

  const sortedList = orderVariant ? orderBy(filteredList, orderVariant.field, orderVariant.direction) : filteredList;

  const now = Date.now();

  return (
    <Modal size="md" height="lg">
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Title close>
        <div className="flex gap-2">
          <span>{t('fellowship.activityFeed.activityModal.title')}</span>

          {input && (
            <ChainTitle chainId={input.chainId} fontClass="text-text-primary text-header-title font-bold"></ChainTitle>
          )}
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
              <Select.Item value="date-asc">{t('fellowship.activityFeed.activityModal.sort.date-asc')}</Select.Item>
              <Select.Item value="date-desc">{t('fellowship.activityFeed.activityModal.sort.date-desc')}</Select.Item>
            </Select>
          </div>
        </div>
      </Modal.HeaderContent>
      <Modal.Content>
        <div className="py-4">
          {isLoading && Array.from({ length: 5 }).map((_, i) => <ActivityPlaceholder key={i} />)}

          {isNothingFound && (
            <EmptyList message={t('fellowship.activityFeed.activityModal.nothing-found', { query })} />
          )}

          {sortedList.map(record => {
            const identity = identities[record.accountId];

            return (
              <div key={`${record.block}-${record.accountId}-${record.type}`} className="flex flex-col gap-1 px-5 pt-2">
                <div className="flex items-center gap-2 text-button-small">
                  <div className="min-w-0 grow">
                    {nonNullable(input?.chain) && (
                      <BodyText>
                        <div className="flex items-center gap-2">
                          <Address
                            title={identity ? identityService.getFullName(identity) : undefined}
                            hideAddress
                            showIcon
                            variant="short"
                            address={toAddress(record.accountId, { prefix: input.chain.addressPrefix })}
                          />
                        </div>
                      </BodyText>
                    )}
                  </div>
                  <HelpText className="max-w-[40%] shrink-0 text-end text-text-secondary">
                    <Duration seconds={(now - record.at.getTime()) / 1000} shortFormat />
                  </HelpText>
                </div>
                <FootnoteText className="text-text-secondary">
                  <Slot id={activityFeedRecordDescriptionSlot} props={{ t, record }} />
                </FootnoteText>
              </div>
            );
          })}
        </div>
      </Modal.Content>
    </Modal>
  );
};
