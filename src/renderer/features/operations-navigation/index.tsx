import { useUnit } from 'effector-react';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { Paths } from '@/shared/routes';
import { BodyText } from '@/shared/ui';
import { selectedWalletMultisigOperations } from '@/aggregates/selected-wallet-multisig-operations';
import { navigationTopLinksPipeline } from '@/features/app-shell';

export const operationsNavigationFeature = createFeature({
  name: 'operations/navigation',
  enable: $features.map(({ operations }) => operations),
});

operationsNavigationFeature.inject(navigationTopLinksPipeline, (items) => {
  const operations = useUnit(selectedWalletMultisigOperations.$list);
  const pending = operations.filter((t) => t.status === 'pending');

  return items.concat({
    order: 4,
    icon: 'operations',
    title: 'navigation.mstOperationLabel',
    link: Paths.OPERATIONS,
    badge: pending.length > 0 ? <BodyText className="ml-auto text-text-tertiary">{pending.length}</BodyText> : null,
  });
});
