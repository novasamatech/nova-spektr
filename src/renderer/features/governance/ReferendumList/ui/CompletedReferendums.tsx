import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { Voted, ReferendumTimer } from '@entities/governance';
import { FootnoteText, Accordion, Plate, CaptionText, OperationStatus, HeadlineText } from '@shared/ui';
import type { ReferendumId, ReferendumInfo } from '@shared/core';
import { referendumListModel } from '../model/referendum-list-model';

type Props = {
  referendums: Record<ReferendumId, ReferendumInfo>;
  onSelected: (index: ReferendumId) => void;
};

export const CompletedReferendums = ({ referendums, onSelected }: Props) => {
  const { t } = useI18n();

  const referendumsDetails = useUnit(referendumListModel.$referendumsDetails);

  return (
    <Accordion isDefaultOpen>
      <Accordion.Button buttonClass="py-1.5 px-2 mb-2">
        <div className="flex items-center gap-x-2 w-full">
          <CaptionText className="uppercase text-text-secondary tracking-[0.75px] font-semibold">
            {t('governance.referendums.completed')}
          </CaptionText>
          <CaptionText className="text-text-tertiary font-semibold">{Object.keys(referendums).length}</CaptionText>
        </div>
      </Accordion.Button>
      <Accordion.Content as="ul" className="flex flex-col gap-y-2">
        {Object.entries(referendums).map(([index, referendum]) => (
          <Plate as="li" key={index} className="flex flex-col gap-y-3">
            <div className="flex items-center gap-x-2">
              <Voted />
              <OperationStatus pallet="success">Approved</OperationStatus>
              <ReferendumTimer status="reject" time={600000} />
              <FootnoteText className="ml-auto text-text-secondary">#{index}</FootnoteText>
            </div>
            <HeadlineText>{referendumsDetails[index] || `Referendum #${index}`}</HeadlineText>
          </Plate>
        ))}
      </Accordion.Content>
    </Accordion>
  );
};
