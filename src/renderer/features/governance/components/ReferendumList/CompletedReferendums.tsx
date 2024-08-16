import { memo } from 'react';

import { useI18n } from '@app/providers';
import { type CompletedReferendum } from '@shared/core';
import { useDeferredList } from '@shared/lib/hooks';
import { Accordion, CaptionText, Shimmering } from '@shared/ui';
import { type AggregatedReferendum } from '../../types/structs';

import { CompletedReferendumItem } from './CompletedReferendumItem';
import { ListItemPlaceholder } from './ListItemPlaceholder';

type Props = {
  referendums: AggregatedReferendum<CompletedReferendum>[];
  isLoading: boolean;
  isTitlesLoading: boolean;
  onSelect: (value: AggregatedReferendum<CompletedReferendum>) => void;
};

const placeholder = Array.from({ length: 4 }, (_, index) => (
  <li key={`placeholder${index}`}>
    <ListItemPlaceholder />
  </li>
));

export const CompletedReferendums = memo<Props>(({ referendums, isLoading, isTitlesLoading, onSelect }) => {
  const { t } = useI18n();
  const { isLoading: shouldRenderLoadingState, list: deferredReferendums } = useDeferredList({
    isLoading,
    list: referendums,
  });

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
        {shouldRenderLoadingState && placeholder}

        {!shouldRenderLoadingState &&
          deferredReferendums.map((referendum) => (
            <li key={referendum.referendumId}>
              <CompletedReferendumItem referendum={referendum} isTitlesLoading={isTitlesLoading} onSelect={onSelect} />
            </li>
          ))}
      </Accordion.Content>
    </Accordion>
  );
});
