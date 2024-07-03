import { FC } from 'react';

import { referendumUtils, VoteChart } from '@entities/governance';
// import { formatBalance } from '@shared/lib/utils';
import { Asset, Referendum, VotingThreshold } from '@shared/core';
import { VotingStatusBadge } from '../../VotingStatus/ui/VotingStatusBadge';
import { referendumListUtils } from '../../ReferendumList/lib/referendum-list-utils';

type Props = {
  referendum: Referendum;
  supportThreshold: VotingThreshold | null;
  approvalThreshold: VotingThreshold | null;
  asset: Asset | null;
};

export const VotingStatus: FC<Props> = ({ referendum, asset, supportThreshold, approvalThreshold }) => {
  // const { t } = useI18n();

  const isPassing = supportThreshold?.passing ?? false;

  const votedFractions =
    referendumUtils.isOngoing(referendum) && approvalThreshold
      ? referendumListUtils.getVoteFractions(referendum.tally, approvalThreshold.value)
      : null;
  // const votedCount =
  //   referendumUtils.isOngoing(referendum) && supportThreshold
  //     ? referendumListUtils.getVotedCount(referendum.tally, supportThreshold.value)
  //     : null;

  return (
    <div className="flex flex-col items-start gap-6">
      <VotingStatusBadge passing={isPassing} referendum={referendum} />
      {votedFractions && <VoteChart bgColor="icon-button" descriptionPosition="bottom" {...votedFractions} />}
      {/*{votedCount && (*/}
      {/*  <div className="flex items-center gap-1 justify-between flex-wrap w-full">*/}
      {/*    <div className="flex items-center gap-1">*/}
      {/*      <Icon name="checkmarkOutline" size={18} className="text-icon-positive" />*/}
      {/*      <FootnoteText className="text-text-secondary">{t('governance.referendum.threshold')}</FootnoteText>*/}
      {/*    </div>*/}
      {/*    <FootnoteText>*/}
      {/*      {t('governance.referendum.votedTokens', {*/}
      {/*        voted: formatBalance(votedCount.voted.toString()).value,*/}
      {/*        total: formatBalance(votedCount.of.toString()).value,*/}
      {/*        asset: asset?.symbol,*/}
      {/*      })}*/}
      {/*    </FootnoteText>*/}
      {/*  </div>*/}
      {/*)}*/}
    </div>
  );
};
