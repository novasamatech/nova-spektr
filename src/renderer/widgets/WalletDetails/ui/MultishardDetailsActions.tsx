import { Wallet } from '@shared/core';
import { MultishardMap } from '../lib/types';
import { useI18n } from '@app/providers';
import { DropdownIconButton } from '@shared/ui';
import { walletDetailsUtils } from '../lib/utils';

type Props = {
  wallet: Wallet;
  accounts: MultishardMap;
};

export const MultishardDetailsActions = ({ wallet, accounts }: Props) => {
  const { t } = useI18n();

  const options = [
    {
      id: 'export',
      icon: 'export',
      title: t('walletDetails.vault.export'),
      onClick: () => walletDetailsUtils.exportMultishardWallet(wallet, accounts),
    },
  ];

  return <DropdownIconButton options={options} name="more" className="mt-2" optionsClassName="right-0" />;
};
