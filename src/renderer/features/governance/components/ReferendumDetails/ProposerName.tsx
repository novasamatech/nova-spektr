import { useStoreMap } from 'effector-react';

import { type Referendum } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { toAddress, toShortAddress } from '@/shared/lib/utils';
import { FootnoteText } from '@/shared/ui';
import { Skeleton } from '@/shared/ui-kit';
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
      address={toAddress(proposer.parent.accountId, { prefix: addressPrefix })}
      name={
        proposer.parent.name ||
        proposer.email ||
        proposer.twitter ||
        toShortAddress(toAddress(proposer.parent.accountId, { prefix: addressPrefix }), 6)
      }
    />
  ) : referendumService.isOngoing(referendum) && referendum.submissionDeposit ? (
    <AccountAddress
      addressFont="text-text-secondary"
      size={16}
      address={toAddress(referendum.submissionDeposit.who, { prefix: addressPrefix })}
      name={toShortAddress(toAddress(referendum.submissionDeposit.who, { prefix: addressPrefix }), 6)}
    />
  ) : null;

  const proposerLoader = isProposerLoading ? <Skeleton height="18px" width="70px" /> : null;

  if (!proposerName && !proposerLoader) return null;

  return (
    <div className="flex items-center gap-2">
      <FootnoteText className="text-text-secondary">{t('governance.referendum.proposer')}</FootnoteText>
      {proposerName}
      {proposerLoader}
    </div>
  );
};
