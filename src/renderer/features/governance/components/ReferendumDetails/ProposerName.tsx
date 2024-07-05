import { useStoreMap, useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { FootnoteText, Shimmering } from '@shared/ui';
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

  const isProposerLoading = useUnit(detailsAggregate.$isProposersLoading);

  const proposer = useStoreMap({
    store: detailsAggregate.$proposers,
    keys: [chainId, referendum],
    fn: (x, [chainId, referendum]) => {
      return referendumService.isOngoing(referendum) && referendum.submissionDeposit
        ? pickNestedValue(x, chainId, referendum.submissionDeposit.who)
        : null;
    },
  });

  if (!isProposerLoading && !proposer) {
    return null;
  }

  return (
    <FootnoteText className="text-text-secondary flex items-center">
      {t('governance.referendum.proposer', {
        name: proposer
          ? proposer.parent.name || proposer.email || proposer.twitter || proposer.parent.address || 'Unknown'
          : null,
      })}
      {isProposerLoading && !proposer ? <Shimmering height={18} width={70} /> : null}
    </FootnoteText>
  );
};
