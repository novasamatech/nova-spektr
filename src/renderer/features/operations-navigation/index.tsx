import { useUnit } from 'effector-react';

import { $features } from '@/shared/config/features';
import { MultisigTxInitStatus } from '@/shared/core';
import { createFeature } from '@/shared/effector';
import { Paths } from '@/shared/routes';
import { BodyText } from '@/shared/ui';
import { useMultisigTx } from '@/entities/multisig';
import { networkModel } from '@/entities/network';
import { walletModel, walletUtils } from '@/entities/wallet';
import { navigationTopLinksPipeline } from '@/features/app-shell';

export const operationsNavigationFeature = createFeature({
  name: 'operations/navigation',
  enable: $features.map(({ operations }) => operations),
});

operationsNavigationFeature.inject(navigationTopLinksPipeline, (items) => {
  const wallet = useUnit(walletModel.$activeWallet);
  const chains = useUnit(networkModel.$chains);
  const { getLiveAccountMultisigTxs } = useMultisigTx({});

  const txs = getLiveAccountMultisigTxs(walletUtils.isMultisig(wallet) ? [wallet.accounts[0].accountId] : []).filter(
    (tx) => tx.status === MultisigTxInitStatus.SIGNING && chains[tx.chainId],
  );

  return items.concat({
    order: 4,
    icon: 'operations',
    title: 'navigation.mstOperationLabel',
    link: Paths.OPERATIONS,
    badge: txs.length > 0 ? <BodyText className="ml-auto text-text-tertiary">{txs.length}</BodyText> : null,
  });
});
