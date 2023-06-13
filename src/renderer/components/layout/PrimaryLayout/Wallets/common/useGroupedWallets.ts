import { useEffect, useState } from 'react';
import { uniq } from 'lodash';

import { WalletDS } from '@renderer/services/storage';
import { ChainsRecord, GroupedWallets } from './types';
import { getMultishardStructure } from '@renderer/components/layout/PrimaryLayout/Wallets/common/utils';
import { SigningType, WalletType } from '@renderer/domain/shared-kernel';
import { includes } from '@renderer/shared/utils/strings';
import { useAccount } from '@renderer/services/account/accountService';
import { Account } from '@renderer/domain/account';
import { toAddress } from '@renderer/shared/utils/address';

export const useGroupedWallets = (
  liveWallets: WalletDS[],
  chains: ChainsRecord,
  searchQuery: string,
): GroupedWallets | undefined => {
  const { getLiveAccounts } = useAccount();

  const watchOnlyAccounts = getLiveAccounts({ signingType: SigningType.WATCH_ONLY });
  const paritySignerAccounts = getLiveAccounts({ signingType: SigningType.PARITY_SIGNER });
  const multisigAccounts = getLiveAccounts({ signingType: SigningType.MULTISIG });

  const [wallets, setWallets] = useState<GroupedWallets>();

  useEffect(() => {
    setWallets({
      [WalletType.SINGLE_PARITY_SIGNER]: paritySignerAccounts.filter((a) => !a.walletId),
      [WalletType.MULTISHARD_PARITY_SIGNER]: getMultishardWallets(),
      [WalletType.WATCH_ONLY]: watchOnlyAccounts,
      [WalletType.MULTISIG]: multisigAccounts,
    });
  }, [watchOnlyAccounts.length, paritySignerAccounts.length, multisigAccounts.length, liveWallets.length]);

  useEffect(() => {
    const searchedParitySignerAccounts = searchAccount(paritySignerAccounts, searchQuery);
    const searchedWatchOnlyAccounts = searchAccount(watchOnlyAccounts, searchQuery);
    const searchedMultisigAccounts = searchAccount(multisigAccounts, searchQuery);

    const searchedShards = uniq(searchedParitySignerAccounts.map((a) => a.walletId).filter((a) => a));

    const multishardWallets = getMultishardWallets().filter(
      (w) => includes(w.name, searchQuery) || searchedShards.includes(w.id),
    );

    setWallets({
      [WalletType.SINGLE_PARITY_SIGNER]: searchedParitySignerAccounts.filter((a) => !a.walletId),
      [WalletType.MULTISHARD_PARITY_SIGNER]: multishardWallets,
      [WalletType.WATCH_ONLY]: searchedWatchOnlyAccounts,
      [WalletType.MULTISIG]: searchedMultisigAccounts,
    });
  }, [searchQuery]);

  const searchAccount = (accounts: Account[] = [], query = '') => {
    return accounts.filter((account) => {
      const accountAddress = toAddress(
        account.accountId,
        account.chainId && { prefix: chains[account.chainId].addressPrefix },
      );

      return includes(account.name, query) || includes(accountAddress, query);
    });
  };

  const getMultishardWallets = () =>
    liveWallets
      .filter((w) => w.id && w.type === WalletType.MULTISHARD_PARITY_SIGNER)
      .map((w) => ({ ...w, ...getMultishardStructure(paritySignerAccounts, chains, w.id!) }));

  return wallets;
};
