import { useStoreMap, useUnit } from 'effector-react';
import { isEmpty } from 'lodash';
import { useMemo } from 'react';

import { useI18n } from '@app/providers';
import { Voted, VoteChart, governanceModel, TrackInfo } from '@entities/governance';
import { Accordion, CaptionText, HeadlineText } from '@shared/ui';
import type { ReferendumId, OngoingReferendum } from '@shared/core';
import { VotingStatusBadge } from '../../VotingStatus/ui/VotingStatusBadge';
import { referendumListUtils } from '../lib/referendum-list-utils';
import { referendumListModel } from '../model/referendum-list-model';
import { ListItem } from './ListItem';

type Props = {
  referendums: Record<ReferendumId, OngoingReferendum>;
  onSelect: (value: OngoingReferendum) => void;
};

export const OngoingReferendums = ({ referendums, onSelect }: Props) => {
  const { t } = useI18n();

  const chain = useUnit(referendumListModel.$chain);

  const voting = useUnit(governanceModel.$voting);

  const names = useStoreMap({
    store: referendumListModel.$referendumsNames,
    keys: [chain],
    fn: (x, [chain]) => (chain ? x[chain.chainId] ?? {} : {}),
  });

  const approvalThresholds = useStoreMap({
    store: governanceModel.$approvalThresholds,
    keys: [chain],
    fn: (x, [chain]) => (chain ? x[chain.chainId] ?? {} : {}),
  });

  const supportThresholds = useStoreMap({
    store: governanceModel.$supportThresholds,
    keys: [chain],
    fn: (x, [chain]) => (chain ? x[chain.chainId] ?? {} : {}),
  });

  const referendumList = useMemo(() => Object.values(referendums), [referendums]);

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
        {referendumList.map((referendum) => {
          const approvalThreshold = approvalThresholds[referendum.referendumId];
          const supportThreshold = supportThresholds[referendum.referendumId];

          const isPassing = supportThreshold ? supportThreshold.passing : false;
          const voteFractions = approvalThreshold
            ? referendumListUtils.getVoteFractions(referendum.tally, approvalThreshold.value)
            : null;

          return (
            <li key={referendum.referendumId}>
              <ListItem onClick={() => onSelect(referendum)}>
                <div className="flex items-center gap-x-2 w-full">
                  <Voted active={referendumListUtils.isReferendumVoted(referendum.referendumId, voting)} />
                  <VotingStatusBadge passing={isPassing} referendum={referendum} />

                  {/*<ReferendumTimer status="reject" time={600000} />*/}
                  <TrackInfo index={referendum.referendumId} trackId={referendum.track} />
                </div>
                <div className="flex items-start gap-x-6 w-full">
                  <HeadlineText className="flex-1 pointer-events-auto">
                    {names[referendum.referendumId] ||
                      t('governance.referendums.referendumTitle', { index: referendum.referendumId })}
                  </HeadlineText>
                  <div className="basis-[200px] shrink-0">
                    {voteFractions ? (
                      <VoteChart
                        bgColor="icon-button"
                        aye={voteFractions.aye}
                        nay={voteFractions.nay}
                        pass={voteFractions.pass}
                      />
                    ) : null}
                  </div>
                </div>
              </ListItem>
            </li>
          );
        })}
      </Accordion.Content>
    </Accordion>
  );
};
