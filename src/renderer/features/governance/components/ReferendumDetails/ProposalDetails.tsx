import { useStoreMap, useUnit } from 'effector-react';

import { type Proposal } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { formatBalance } from '@/shared/lib/utils';
import { DetailRow } from '@/shared/ui';
import { Account } from '@/shared/ui-entities';
import { descriptionsModel } from '../../model/description';
import { networkSelectorModel } from '../../model/networkSelector';

type Props = {
  proposal: Proposal;
};

export const ProposalDetails = ({ proposal }: Props) => {
  const nativeAsset = useUnit(networkSelectorModel.$nativeAsset);
  const chain = useUnit(networkSelectorModel.$governanceChain);

  const identity = useStoreMap({
    store: descriptionsModel.$identities,
    keys: [proposal],
    fn: (identities, [proposal]) =>
      proposal && proposal.type === 'Spend' ? identities[proposal.beneficiary] : undefined,
  });

  const { t } = useI18n();

  if (!chain || proposal.type !== 'Spend') {
    return null;
  }

  const amount = formatBalance(proposal.amount.toString(), nativeAsset?.precision ?? 0, { shorthands: { M: false } });
  return (
    <>
      <DetailRow className="text-right text-text-secondary" label={t('governance.advanced.fields.beneficiary')}>
        <Account accountId={proposal.beneficiary} variant="short" chain={chain} title={identity?.name} hideAddress />
      </DetailRow>
      <DetailRow
        label={t('governance.advanced.fields.requested')}
      >{`${amount.formatted} ${nativeAsset?.symbol}`}</DetailRow>
    </>
  );
};
