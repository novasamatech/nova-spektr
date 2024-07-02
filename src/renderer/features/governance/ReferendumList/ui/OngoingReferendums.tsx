import { useUnit } from 'effector-react';
import { isEmpty } from 'lodash';
import { useMemo } from 'react';

import { useI18n } from '@app/providers';
import { Voted, VoteChart, governanceModel, TrackInfo } from '@entities/governance';
import { Accordion, CaptionText, HeadlineText } from '@shared/ui';
import type { ReferendumId, OngoingReferendum } from '@shared/core';
import { referendumListUtils } from '../lib/referendum-list-utils';
import { referendumListModel } from '../model/referendum-list-model';
import { VotingStatusBadge } from '@features/governance/VotingStatus/ui/VotingStatusBadge';

type Props = {
  referendums: Record<ReferendumId, OngoingReferendum>;
  onSelect: (value: OngoingReferendum) => void;
};

export const OngoingReferendums = ({ referendums, onSelect }: Props) => {
  const { t } = useI18n();

  const voting = useUnit(governanceModel.$voting);
  const approvalThresholds = useUnit(governanceModel.$approvalThresholds);
  const supportThresholds = useUnit(governanceModel.$supportThresholds);
  const chain = useUnit(referendumListModel.$chain);
  const names = useUnit(referendumListModel.$referendumsNames);

  const referendumList = useMemo(() => Object.entries(referendums), [referendums]);

  if (!chain || isEmpty(approvalThresholds) || isEmpty(supportThresholds) || referendumList.length === 0) return null;

  return (
    <Accordion isDefaultOpen>
      <Accordion.Button buttonClass="py-1.5 px-2 mb-2">
        <div className="flex items-center gap-x-2 w-full">
          <CaptionText className="uppercase text-text-secondary tracking-[0.75px] font-semibold">
            {t('governance.referendums.ongoing')}
          </CaptionText>
          <CaptionText className="text-text-tertiary font-semibold">{referendumList.length}</CaptionText>
        </div>
      </Accordion.Button>
      <Accordion.Content as="ul" className="flex flex-col gap-y-2">
        {referendumList.map(([index, referendum]) => {
          const isPassing = supportThresholds[index].passing;
          const voteFractions = referendumListUtils.getVoteFractions(referendum.tally, approvalThresholds[index].value);

          return (
            <li key={index}>
              <button
                className="flex flex-col gap-y-3 p-3 w-full rounded-md bg-white"
                onClick={() => onSelect(referendum)}
              >
                <div className="flex items-center gap-x-2 w-full">
                  <Voted active={referendumListUtils.isReferendumVoted(index, voting)} />
                  <VotingStatusBadge passing={isPassing} referendum={referendum} />

                  {/*<ReferendumTimer status="reject" time={600000} />*/}
                  <TrackInfo index={index} trackId={referendum.track} />
                </div>
                <div className="flex items-start gap-x-6 w-full">
                  <HeadlineText className="flex-1 pointer-events-auto">
                    {names[chain.chainId]?.[index] || t('governance.referendums.referendumTitle', { index })}
                  </HeadlineText>
                  <div className="basis-[200px] shrink-0">
                    <VoteChart
                      bgColor="icon-button"
                      aye={voteFractions.aye}
                      nay={voteFractions.nay}
                      pass={voteFractions.pass}
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
