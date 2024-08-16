import { memo, useDeferredValue } from 'react';

import { useI18n } from '@app/providers';
import { type CompletedReferendum } from '@shared/core';
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
  <li key={index}>
    <ListItemPlaceholder />
  </li>
));

export const CompletedReferendums = memo<Props>(({ referendums, isLoading, isTitlesLoading, onSelect }) => {
  const { t } = useI18n();
  const deferredReferendums = useDeferredValue(referendums);

  return (
    <Accordion>
      <Accordion.Button buttonClass="py-1.5 px-2 mb-2">
        <div className="flex w-full items-center gap-x-2">
          <CaptionText className="font-semibold uppercase tracking-[0.75px] text-text-secondary">
            {t('governance.referendums.completed')}
          </CaptionText>
          {isLoading ? (
            <Shimmering width={25} height={12} />
          ) : (
            <CaptionText className="font-semibold text-text-tertiary">{referendums.length.toString()}</CaptionText>
          )}
        </div>
      </Accordion.Button>
      <Accordion.Content as="ul" className="flex flex-col gap-y-2">
        {!!isLoading && placeholder}

        {!isLoading &&
          deferredReferendums.map((referendum) => (
            <li key={referendum.referendumId}>
              <CompletedReferendumItem referendum={referendum} isTitlesLoading={isTitlesLoading} onSelect={onSelect} />
            </li>
          ))}
      </Accordion.Content>
    </Accordion>
  );
});
