import { useUnit } from 'effector-react';
import { isEmpty } from 'lodash';

import { useI18n } from '@app/providers';
import { Voted, VoteChartSm, governanceModel } from '@entities/governance';
import { FootnoteText, Accordion, CaptionText, OperationStatus, HeadlineText, Icon } from '@shared/ui';
import type { ReferendumId, OngoingReferendum } from '@shared/core';
import { referendumListUtils } from '../lib/referendum-list-utils';
import { referendumListModel } from '../model/referendum-list-model';

type Props = {
  referendums: Map<ReferendumId, OngoingReferendum>;
  onSelected: (index: ReferendumId) => void;
};

export const OngoingReferendums = ({ referendums, onSelected }: Props) => {
  const { t } = useI18n();

  const voting = useUnit(governanceModel.$voting);
  const approvalThresholds = useUnit(governanceModel.$approvalThresholds);
  const supportThresholds = useUnit(governanceModel.$supportThresholds);
  const details = useUnit(referendumListModel.$referendumsDetails);

  if (isEmpty(approvalThresholds) || isEmpty(supportThresholds) || referendums.size === 0) return null;

  return (
    <Accordion isDefaultOpen>
      <Accordion.Button buttonClass="py-1.5 px-2 mb-2">
        <div className="flex items-center gap-x-2 w-full">
          <CaptionText className="uppercase text-text-secondary tracking-[0.75px] font-semibold">
            {t('governance.referendums.ongoing')}
          </CaptionText>
          <CaptionText className="text-text-tertiary font-semibold">{referendums.size}</CaptionText>
        </div>
      </Accordion.Button>
      <Accordion.Content as="ul" className="flex flex-col gap-y-2">
        {Array.from(referendums).map(([index, referendum]) => {
          const track = referendumListUtils.getTrackInfo(referendum.track);
          const isPassing = supportThresholds[index].passing;

          return (
            <li key={index}>
              <button
                className="flex flex-col gap-y-3 p-3 w-full rounded-md bg-white"
                onClick={() => onSelected(index)}
              >
                <div className="flex items-center gap-x-2 w-full">
                  <Voted active={referendumListUtils.isReferendumVoted(index, voting)} />
                  <OperationStatus pallet={isPassing ? 'success' : 'default'}>
                    {isPassing ? t('governance.referendums.passing') : t('governance.referendums.deciding')}
                  </OperationStatus>
                  {/*<ReferendumTimer status="reject" time={600000} />*/}
                  <div className="flex ml-auto text-text-secondary">
                    <FootnoteText className="text-inherit">#{index}</FootnoteText>
                    <Icon name={track.icon} size={16} className="text-inherit ml-2 mr-1" />
                    <FootnoteText className="text-inherit">{t(track.title)}</FootnoteText>
                  </div>
                </div>
                <div className="flex items-start gap-x-6 w-full">
                  <HeadlineText className="flex-1 pointer-events-auto">
                    {details[index] || t('governance.referendums.referendumTitle', { index })}
                  </HeadlineText>
                  <div className="basis-[200px] shrink-0">
                    <VoteChartSm
                      bgColor="icon-button"
                      {...referendumListUtils.getVoteFractions(referendum.tally, approvalThresholds[index].value)}
                    />
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </Accordion.Content>
    </Accordion>
  );
};
