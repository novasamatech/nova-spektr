import { BaseAccount, Wallet } from '@shared/core';
import { VaultMap } from '../lib/types';
import { useI18n } from '@app/providers';
import { DropdownIconButton } from '@shared/ui';
import { walletDetailsUtils } from '../lib/utils';

type Props = {
  wallet: Wallet;
  root: BaseAccount;
  accountsMap: VaultMap;
};

export const VaultDetailsActions = ({ wallet, root, accountsMap }: Props) => {
  const { t } = useI18n();

  const options = [
    {
      id: 'export',
      icon: 'export',
      title: t('walletDetails.vault.export'),
      onClick: () => walletDetailsUtils.exportVaultWallet(wallet, root, accountsMap),
    },
  ];

  return <DropdownIconButton options={options} name="more" className="mt-2" optionsClassName="right-0" />;
};
