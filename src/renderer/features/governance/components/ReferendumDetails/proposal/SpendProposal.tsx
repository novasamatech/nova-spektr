import { useStoreMap, useUnit } from 'effector-react';

import { type SpendProposal as SpendProposalType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { formatBalance, toAddress } from '@/shared/lib/utils';
import { FootnoteText } from '@/shared/ui';
import { Address } from '@/shared/ui-entities';
import { descriptionsModel } from '../../../model/description';
import { networkSelectorModel } from '../../../model/networkSelector';

type Props = {
  proposal: SpendProposalType;
};

export const SpendProposal = ({ proposal }: Props) => {
  const nativeAsset = useUnit(networkSelectorModel.$nativeAsset);
  const chain = useUnit(networkSelectorModel.$governanceChain);

  const identity = useStoreMap({
    store: descriptionsModel.$identities,
    keys: [proposal.beneficiary],
    fn: (identities, [address]) => identities[address],
  });

  const { t } = useI18n();

  if (!chain) {
    return null;
  }

  const amount = formatBalance(proposal.amount.toString(), nativeAsset?.precision ?? 0, { shorthands: { M: false } });
  const formattedAddress = toAddress(proposal.beneficiary, { prefix: chain.addressPrefix });

  return (
    <div className="flex items-center gap-2 text-text-secondary">
      <FootnoteText className="text-text-secondary">{t('governance.referendum.beneficiary')}</FootnoteText>
      <FootnoteText className="grow">
        <Address address={formattedAddress} variant="short" showIcon title={identity?.name} hideAddress />
      </FootnoteText>
      <FootnoteText className="flex shrink-0 text-text-secondary">
        {t('governance.referendum.requested', { amount: amount.formatted, asset: nativeAsset?.symbol })}
      </FootnoteText>
    </div>
  );
};
