import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { DetailRow } from '@/shared/ui';
import { AccountExplorers, WalletIcon } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { type MultisigOperation } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { walletSelect } from '@/aggregates/wallet-select';
import { operationsContextModel } from '../model/context';

type Props = {
  operation: MultisigOperation;
};

export const OperationDetails = ({ operation }: Props) => {
  const { t } = useI18n();
  const chains = useUnit(networkModel.$chains);
  const activeWallet = useUnit(walletSelect.$selectedWallet);
  const initiator = useUnit(operationsContextModel.$initiator);

  const chain = chains[operation.chainId];

  if (!activeWallet || !initiator || !chain) return null;

  return (
    <DetailRow label={t('operation.details.multisigWallet')}>
      <Box direction="row" gap={2}>
        <WalletIcon type={activeWallet.type} size={16} />
        <span>{activeWallet.name}</span>
        <AccountExplorers accountId={initiator.accountId} chain={chain} />
      </Box>
    </DetailRow>
  );
};
