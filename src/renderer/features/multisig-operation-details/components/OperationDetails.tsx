import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { DetailRow } from '@/shared/ui';
import { AccountExplorers } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { type MultisigOperation } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { WalletIcon, walletModel } from '@/entities/wallet';

type Props = {
  operation: MultisigOperation;
};

export const OperationDetails = ({ operation }: Props) => {
  const { t } = useI18n();
  const chains = useUnit(networkModel.$chains);
  const activeWallet = useUnit(walletModel.$activeWallet);
  const activeAccounts = useUnit(walletModel.$activeAccounts);

  const accountId = activeAccounts.at(0)?.accountId;
  const chain = chains[operation.chainId];

  if (!activeWallet || !accountId || !chain) return null;

  return (
    <DetailRow label={t('operation.details.multisigWallet')}>
      <Box direction="row" gap={2}>
        <WalletIcon type={activeWallet.type} size={16} />
        <span>{activeWallet.name}</span>
        <AccountExplorers accountId={accountId} chain={chain} />
      </Box>
    </DetailRow>
  );
};
