import { type ApiPromise } from '@polkadot/api';
import { memo } from 'react';

import { type Asset, type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useDeferredList } from '@/shared/lib/hooks';
import { nonNullable } from '@/shared/lib/utils';
import { CaptionText } from '@/shared/ui';
import { Accordion, AsyncItem, Skeleton } from '@/shared/ui-kit';
import { type AggregatedReferendum } from '../../types/structs';

import { ListItemPlaceholder } from './ListItemPlaceholder';
import { ReferendumItem } from './ReferendumItem';

type Props = {
  timelineApi?: ApiPromise;
  chain?: Chain;
  asset?: Asset;
  referendums: AggregatedReferendum[];
  isLoading: boolean;
  isTitlesLoading: boolean;
  mixLoadingWithData: boolean;
  onSelect: (value: AggregatedReferendum) => void;
};

const createPlaceholders = (size: number) => {
  return Array.from({ length: size }, (_, index) => (
    <li key={`placeholder${index}`}>
      <ListItemPlaceholder />
    </li>
  ));
};

export const CompletedReferendums = memo(
  ({ timelineApi, chain, asset, referendums, isLoading, isTitlesLoading, mixLoadingWithData, onSelect }: Props) => {
    const { t } = useI18n();

    const { isLoading: isLoadingState, list: deferredReferendums } = useDeferredList({
      isLoading,
      list: referendums,
    });

    const placeholdersCount = isLoadingState
      ? Math.min(referendums.length || 4, 50)
      : Math.max(1, 3 - referendums.length);

    if (!isLoading && referendums.length === 0) return null;

    const showList =
      (!isLoadingState || mixLoadingWithData) && nonNullable(timelineApi) && nonNullable(asset) && nonNullable(chain);
    const showPlaceholders = isLoadingState || mixLoadingWithData;

    return (
      <Accordion initialOpen>
        <Accordion.Trigger>
          <div className="flex w-full items-center gap-x-2">
            <CaptionText className="font-semibold tracking-[0.75px] text-text-secondary uppercase">
              {t('governance.referendums.completed')}
            </CaptionText>
            <CaptionText className="font-semibold text-text-tertiary">
              {isLoading ? <Skeleton width="3ch" height="1em" /> : referendums.length.toString()}
            </CaptionText>
          </div>
        </Accordion.Trigger>
        <Accordion.Content>
          <ul className="mt-3 flex flex-col gap-y-2">
            {showPlaceholders && createPlaceholders(placeholdersCount)}

            {showList &&
              deferredReferendums.map((referendum) => (
                <li key={referendum.referendumId}>
                  <AsyncItem fallback={<ListItemPlaceholder />}>
                    <ReferendumItem
                      timelineApi={timelineApi}
                      chain={chain}
                      asset={asset}
                      referendum={referendum}
                      isTitlesLoading={isTitlesLoading}
                      onSelect={onSelect}
                    />
                  </AsyncItem>
                </li>
              ))}
          </ul>
        </Accordion.Content>
      </Accordion>
    );
  },
);
