import { memo } from 'react';

import { useI18n } from '@app/providers';
import { Accordion, CaptionText, Shimmering } from '@shared/ui';
import { type AggregatedReferendum } from '../../types/structs';

import { ListItemPlaceholder } from './ListItemPlaceholder';
import { ReferendumItem } from './ReferendumItem';

type Props = {
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

export const OngoingReferendums = memo<Props>(
  ({ referendums, isLoading, isTitlesLoading, mixLoadingWithData, onSelect }) => {
    const { t } = useI18n();

    const placeholdersCount = isLoading ? Math.min(referendums.length || 4, 20) : Math.max(1, 4 - referendums.length);

    if (!isLoading && referendums.length === 0) return null;

    return (
      <Accordion isDefaultOpen>
        <Accordion.Button buttonClass="py-1.5 px-2 mb-2">
          <div className="flex w-full items-center gap-x-2">
            <CaptionText className="uppercase text-text-secondary">{t('governance.referendums.ongoing')}</CaptionText>
            <CaptionText className="font-semibold text-text-tertiary">
              {isLoading ? <Shimmering width="3ch" height="1em" /> : referendums.length.toString()}
            </CaptionText>
          </div>
        </Accordion.Button>
        <Accordion.Content as="ul" className="flex flex-col gap-y-2">
          {(!isLoading || mixLoadingWithData) &&
            referendums.map((referendum) => (
              <li key={referendum.referendumId}>
                <ReferendumItem referendum={referendum} isTitlesLoading={isTitlesLoading} onSelect={onSelect} />
              </li>
            ))}
          {(isLoading || mixLoadingWithData) && createPlaceholders(placeholdersCount)}
        </Accordion.Content>
      </Accordion>
    );
  },
);
