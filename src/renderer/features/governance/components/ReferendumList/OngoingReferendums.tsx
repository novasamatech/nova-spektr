import { type ApiPromise } from '@polkadot/api';
import { memo } from 'react';

import { type Asset } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { nonNullable } from '@/shared/lib/utils';
import { CaptionText } from '@/shared/ui';
import { Accordion, Skeleton } from '@/shared/ui-kit';
import { type AggregatedReferendum } from '../../types/structs';

import { ListItemPlaceholder } from './ListItemPlaceholder';
import { ReferendumItem } from './ReferendumItem';

type Props = {
  api?: ApiPromise;
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

export const OngoingReferendums = memo(
  ({ api, asset, referendums, isLoading, isTitlesLoading, mixLoadingWithData, onSelect }: Props) => {
    const { t } = useI18n();

    const placeholdersCount = isLoading ? Math.min(referendums.length || 4, 20) : Math.max(1, 4 - referendums.length);

    if (!isLoading && referendums.length === 0) return null;

    const showList = (!isLoading || mixLoadingWithData) && nonNullable(api) && nonNullable(asset);
    const showPlaceholders = isLoading || mixLoadingWithData;

    return (
      <Accordion initialOpen>
        <Accordion.Trigger>
          <div className="flex w-full items-center gap-x-2">
            <CaptionText className="uppercase text-text-secondary">{t('governance.referendums.ongoing')}</CaptionText>
            <CaptionText className="font-semibold text-text-tertiary">
              {isLoading ? <Skeleton width="3ch" height="1em" /> : referendums.length.toString()}
            </CaptionText>
          </div>
        </Accordion.Trigger>
        <Accordion.Content>
          <ul className="mt-3 flex flex-col gap-y-2">
            {showPlaceholders && createPlaceholders(placeholdersCount)}

            {showList &&
              referendums.map((referendum) => (
                <li key={referendum.referendumId}>
                  <ReferendumItem
                    api={api}
                    asset={asset}
                    referendum={referendum}
                    isTitlesLoading={isTitlesLoading}
                    onSelect={onSelect}
                  />
                </li>
              ))}
          </ul>
        </Accordion.Content>
      </Accordion>
    );
  },
);
