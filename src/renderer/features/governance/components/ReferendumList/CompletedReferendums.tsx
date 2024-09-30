import { type ApiPromise } from '@polkadot/api';
import { memo } from 'react';

import { useI18n } from '@app/providers';
import { useDeferredList } from '@shared/lib/hooks';
import { Accordion, CaptionText, Shimmering } from '@shared/ui';
import { type AggregatedReferendum } from '../../types/structs';

import { ListItemPlaceholder } from './ListItemPlaceholder';
import { ReferendumItem } from './ReferendumItem';

type Props = {
  referendums: AggregatedReferendum[];
  isLoading: boolean;
  isTitlesLoading: boolean;
  mixLoadingWithData: boolean;
  api: ApiPromise;
  onSelect: (value: AggregatedReferendum) => void;
};

const createPlaceholders = (size: number) => {
  return Array.from({ length: size }, (_, index) => (
    <li key={`placeholder${index}`}>
      <ListItemPlaceholder />
    </li>
  ));
};

export const CompletedReferendums = memo<Props>(
  ({ referendums, isLoading, isTitlesLoading, mixLoadingWithData, api, onSelect }) => {
    const { t } = useI18n();

    const { isLoading: shouldRenderLoadingState, list: deferredReferendums } = useDeferredList({
      isLoading,
      list: referendums,
    });

    const placeholdersCount = shouldRenderLoadingState
      ? Math.min(referendums.length || 4, 50)
      : Math.max(1, 3 - referendums.length);

    if (!isLoading && referendums.length === 0) return null;

    return (
      <Accordion isDefaultOpen>
        <Accordion.Button buttonClass="py-1.5 px-2 mb-2">
          <div className="flex w-full items-center gap-x-2">
            <CaptionText className="font-semibold uppercase tracking-[0.75px] text-text-secondary">
              {t('governance.referendums.completed')}
            </CaptionText>
            <CaptionText className="font-semibold text-text-tertiary">
              {isLoading ? <Shimmering width="3ch" height="1em" /> : referendums.length.toString()}
            </CaptionText>
          </div>
        </Accordion.Button>
        <Accordion.Content as="ul" className="flex flex-col gap-y-2">
          {(!shouldRenderLoadingState || mixLoadingWithData) &&
            deferredReferendums.map((referendum) => (
              <li key={referendum.referendumId}>
                <ReferendumItem
                  api={api}
                  referendum={referendum}
                  isTitlesLoading={isTitlesLoading}
                  onSelect={onSelect}
                />
              </li>
            ))}
          {(shouldRenderLoadingState || mixLoadingWithData) && createPlaceholders(placeholdersCount)}
        </Accordion.Content>
      </Accordion>
    );
  },
);
