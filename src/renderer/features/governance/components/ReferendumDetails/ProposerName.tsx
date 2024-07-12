import { useStoreMap } from 'effector-react';

import { useI18n } from '@app/providers';
import { FootnoteText, Identicon, Shimmering } from '@shared/ui';
import { referendumService } from '@entities/governance';
import { pickNestedValue } from '@shared/lib/utils';
import { ChainId, Referendum } from '@shared/core';
import { detailsAggregate } from '../../aggregates/details';

type Props = {
  chainId: ChainId;
  referendum: Referendum;
};

export const ProposerName = ({ chainId, referendum }: Props) => {
  const { t } = useI18n();

  const proposer = useStoreMap({
    store: detailsAggregate.$proposers,
    keys: [chainId, referendum],
    fn: (x, [chainId, referendum]) => {
      return referendumService.isOngoing(referendum) && referendum.submissionDeposit
        ? pickNestedValue(x, chainId, referendum.submissionDeposit.who)
        : null;
    },
  });

  const isProposerLoading = useStoreMap({
    store: detailsAggregate.$isProposersLoading,
    keys: [proposer],
    fn: (loading, [proposer]) => loading && !proposer,
  });

  if (!isProposerLoading && !proposer) {
    return null;
  }

  const proposerName = proposer ? (
    <>
      <Identicon address={proposer.parent.address} size={16} />
      <FootnoteText className="text-text-secondary">
        {proposer.parent.name || proposer.email || proposer.twitter || proposer.parent.address}
      </FootnoteText>
    </>
  ) : null;

  const proposerLoader = isProposerLoading ? <Shimmering height={18} width={70} /> : null;

  return (
    <div className="flex items-center gap-1">
      <FootnoteText className="text-text-secondary">{t('governance.referendum.proposer')}</FootnoteText>
      {proposerName}
      {proposerLoader}
    </div>
  );
};
