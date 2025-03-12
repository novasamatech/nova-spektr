import { useUnit } from 'effector-react';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { Paths } from '@/shared/routes';
import { BodyText } from '@/shared/ui';
import { networkModel } from '@/entities/network';
import { walletSelect } from '@/aggregates/wallet-select';
import { navigationTopLinksPipeline } from '@/features/app-shell';
// TODO: Fix circular dependencies
// eslint-disable-next-line boundaries/entry-point
import { operations } from '@/features/multisig-operations/model/model';

export const operationsNavigationFeature = createFeature({
  name: 'operations/navigation',
  enable: $features.map(({ operations }) => operations),
});

operationsNavigationFeature.inject(navigationTopLinksPipeline, (items) => {
  const wallet = useUnit(walletSelect.$selectedWallet);
  const chains = useUnit(networkModel.$chains);
  const availableOperations = useUnit(operations.$availableOperations);

  if (!wallet) return items;

  const txs = availableOperations.filter((tx) => tx.status === 'pending' && chains[tx.chainId]);

  return items.concat({
    order: 4,
    icon: 'operations',
    title: 'navigation.mstOperationLabel',
    link: Paths.OPERATIONS,
    badge: txs.length > 0 ? <BodyText className="ml-auto text-text-tertiary">{txs.length}</BodyText> : null,
  });
});
