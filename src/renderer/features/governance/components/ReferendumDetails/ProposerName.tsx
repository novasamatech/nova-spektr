import { useStoreMap } from 'effector-react';

import { useI18n } from '@app/providers';
import { toAddress } from '@/shared/lib/utils';
import { type OngoingReferendum, type Referendum } from '@shared/core';
import { FootnoteText, Shimmering } from '@shared/ui';
import { referendumService } from '@entities/governance';
import { AccountAddress } from '@entities/wallet';
import { detailsAggregate } from '../../aggregates/details';

type Props = {
  referendum: Referendum;
};

export const ProposerName = ({ referendum }: Props) => {
  const { t } = useI18n();

  const proposer = useStoreMap({
    store: detailsAggregate.$proposers,
    keys: [referendum],
    fn: (proposers, [referendum]) => {
      return referendumService.isOngoing(referendum) && referendum.submissionDeposit
        ? proposers[referendum.submissionDeposit.who]
        : null;
    },
  });

  const isProposerLoading = useStoreMap({
    store: detailsAggregate.$isProposersLoading,
    keys: [proposer],
    fn: (loading, [proposer]) => loading && !proposer,
  });

  const proposerName = proposer?.parent ? (
    <AccountAddress
      addressFont="text-text-secondary"
      size={16}
      address={proposer.parent.address}
      name={proposer.parent.name || proposer.email || proposer.twitter || proposer.parent.address}
    />
  ) : (referendum as OngoingReferendum)?.submissionDeposit?.who ? (
    <AccountAddress
      addressFont="text-text-secondary"
      size={16}
      address={(referendum as OngoingReferendum).submissionDeposit!.who}
      name={toAddress((referendum as OngoingReferendum).submissionDeposit!.who, { chunk: 6 })}
    />
  ) : null;

  const proposerLoader = isProposerLoading ? <Shimmering height={18} width={70} /> : null;

  console.log('proposerName', proposerName);

  if (!proposerName && !proposerLoader) return null;

  return (
    <div className="flex items-center gap-2">
      <FootnoteText className="text-text-secondary">{t('governance.referendum.proposer')}</FootnoteText>
      {proposerName}
      {proposerLoader}
    </div>
  );
};
