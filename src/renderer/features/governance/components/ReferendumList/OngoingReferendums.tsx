import { memo, useDeferredValue } from 'react';

import { useI18n } from '@app/providers';
import { type OngoingReferendum } from '@shared/core';
import { Accordion, CaptionText, Shimmering } from '@shared/ui';
import { type AggregatedReferendum } from '../../types/structs';

import { ListItemPlaceholder } from './ListItemPlaceholder';
import { OngoingReferendumItem } from './OngoingReferendumItem';

type Props = {
  referendums: AggregatedReferendum<OngoingReferendum>[];
  isLoading: boolean;
  isTitlesLoading: boolean;
  onSelect: (value: AggregatedReferendum<OngoingReferendum>) => void;
};

const placeholder = Array.from({ length: 4 }, (_, index) => (
  <li key={index}>
    <ListItemPlaceholder />
  </li>
));

export const OngoingReferendums = memo<Props>(({ referendums, isLoading, isTitlesLoading, onSelect }) => {
  const { t } = useI18n();
  const deferredReferendums = useDeferredValue(referendums);

  if (deferredReferendums.length === 0) {
    return null;
  }

  return (
    <Accordion isDefaultOpen>
      <Accordion.Button buttonClass="py-1.5 px-2 mb-2">
        <div className="flex items-center gap-x-2 w-full">
          <CaptionText className="uppercase text-text-secondary tracking-[0.75px] font-semibold">
            {t('governance.referendums.ongoing')}
          </CaptionText>
          {isLoading ? (
            <Shimmering width={25} height={12} />
          ) : (
            <CaptionText className="text-text-tertiary font-semibold">{referendums.length}</CaptionText>
          )}
        </div>
      </Accordion.Button>
      <Accordion.Content as="ul" className="flex flex-col gap-y-2">
        {isLoading && placeholder}

        {!isLoading &&
          deferredReferendums.map((referendum) => (
            <li key={referendum.referendumId}>
              <OngoingReferendumItem referendum={referendum} isTitlesLoading={isTitlesLoading} onSelect={onSelect} />
            </li>
          ))}
      </Accordion.Content>
    </Accordion>
  );
});
