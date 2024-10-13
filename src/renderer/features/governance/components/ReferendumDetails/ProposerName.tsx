import { useStoreMap } from 'effector-react';

import { useI18n } from '@/app/providers';
import { type Referendum } from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
import { FootnoteText, Shimmering } from '@/shared/ui';
import { referendumService } from '@/entities/governance';
import { AccountAddress } from '@/entities/wallet';
import { detailsAggregate } from '../../aggregates/details';

type Props = {
  referendum: Referendum;
  addressPrefix: number;
};

export const ProposerName = ({ referendum, addressPrefix }: Props) => {
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
  ) : referendumService.isOngoing(referendum) && referendum.submissionDeposit?.who ? (
    <AccountAddress
      addressFont="text-text-secondary"
      size={16}
      address={referendum.submissionDeposit.who}
      name={toAddress(referendum.submissionDeposit!.who, { chunk: 6, prefix: addressPrefix })}
    />
  ) : null;

  const proposerLoader = isProposerLoading ? <Shimmering height={18} width={70} /> : null;

  if (!proposerName && !proposerLoader) return null;

  return (
    <div className="flex items-center gap-2">
      <FootnoteText className="text-text-secondary">{t('governance.referendum.proposer')}</FootnoteText>
      {proposerName}
      {proposerLoader}
    </div>
  );
};
