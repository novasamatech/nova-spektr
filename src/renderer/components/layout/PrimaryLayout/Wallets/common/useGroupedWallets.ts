import { useEffect, useState } from 'react';
import { uniq } from 'lodash';

import { WalletDS } from '@renderer/shared/api/storage';
import { ChainsRecord, GroupedWallets } from './types';
import {
  getMultishardStructure,
  getWalletConnectStructure,
} from '@renderer/components/layout/PrimaryLayout/Wallets/common/utils';
import { SigningType, WalletType } from '@renderer/domain/shared-kernel';
import { includes, toAddress } from '@renderer/shared/lib/utils';
import { useAccount } from '@renderer/entities/account/lib/accountService';
import { Account } from '@renderer/entities/account/model/account';

export const useGroupedWallets = (
  liveWallets: WalletDS[],
  chains: ChainsRecord,
  searchQuery: string,
): GroupedWallets | undefined => {
  const { getLiveAccounts, getActiveAccounts } = useAccount();
  const activeAccounts = getActiveAccounts();

  const firstActiveAccount = activeAccounts.length > 0 ? activeAccounts[0] : undefined;

  const watchOnlyAccounts = getLiveAccounts({ signingType: SigningType.WATCH_ONLY });
  const paritySignerAccounts = getLiveAccounts({ signingType: SigningType.PARITY_SIGNER });
  const multisigAccounts = getLiveAccounts({ signingType: SigningType.MULTISIG });
  const walletConnectAccounts = getLiveAccounts({ signingType: SigningType.WALLET_CONNECT });

  const [wallets, setWallets] = useState<GroupedWallets>();

  useEffect(() => {
    setWallets({
      [WalletType.SINGLE_PARITY_SIGNER]: paritySignerAccounts.filter((a) => !a.walletId),
      [WalletType.MULTISHARD_PARITY_SIGNER]: getMultishardWallets(),
      [WalletType.MULTISIG]: multisigAccounts,
      [WalletType.WATCH_ONLY]: watchOnlyAccounts,
      [WalletType.WALLET_CONNECT]: getWalletConnectWallets(),
      [WalletType.NOVA_WALLET]: getNovaWalletWallets(),
    });
  }, [watchOnlyAccounts.length, paritySignerAccounts.length, multisigAccounts.length, liveWallets.length]);

  useEffect(() => {
    const searchedParitySignerAccounts = searchAccount(paritySignerAccounts, searchQuery);
    const searchedWatchOnlyAccounts = searchAccount(watchOnlyAccounts, searchQuery);
    const searchedMultisigAccounts = searchAccount(multisigAccounts, searchQuery);
    // const searchedWalletConnectAccounts = searchAccount(walletConnectAccounts, searchQuery);

    const searchedShards = uniq(searchedParitySignerAccounts.map((a) => a.walletId).filter((a) => a));

    const multishardWallets = getMultishardWallets().filter(
      (w) => includes(w.name, searchQuery) || searchedShards.includes(w.id),
    );

    const walletConnectWallets = getWalletConnectWallets().filter(
      (w) => includes(w.name, searchQuery) || searchedShards.includes(w.id),
    );

    const novaWalletWallets = getNovaWalletWallets().filter(
      (w) => includes(w.name, searchQuery) || searchedShards.includes(w.id),
    );

    setWallets({
      [WalletType.SINGLE_PARITY_SIGNER]: searchedParitySignerAccounts.filter((a) => !a.walletId),
      [WalletType.MULTISHARD_PARITY_SIGNER]: multishardWallets,
      [WalletType.MULTISIG]: searchedMultisigAccounts,
      [WalletType.WATCH_ONLY]: searchedWatchOnlyAccounts,
      [WalletType.WALLET_CONNECT]: walletConnectWallets,
      [WalletType.NOVA_WALLET]: novaWalletWallets,
    });
  }, [searchQuery, firstActiveAccount?.id, firstActiveAccount?.signingType]);

  const searchAccount = (accounts: Account[] = [], query = '') => {
    return accounts.filter((account) => {
      const accountAddress = toAddress(
        account.accountId,
        account.chainId && { prefix: chains[account.chainId]?.addressPrefix },
      );

      return includes(account.name, query) || includes(accountAddress, query);
    });
  };

  const getMultishardWallets = () =>
    liveWallets
      .filter((w) => w.id && w.type === WalletType.MULTISHARD_PARITY_SIGNER)
      .map((w) => ({ ...w, ...getMultishardStructure(paritySignerAccounts, chains, w.id!) }));

  const getWalletConnectWallets = () =>
    liveWallets
      .filter((w) => w.id && w.type === WalletType.WALLET_CONNECT)
      .map((w) => ({ ...w, ...getWalletConnectStructure(walletConnectAccounts, w.id!) }));

  const getNovaWalletWallets = () =>
    liveWallets
      .filter((w) => w.id && w.type === WalletType.NOVA_WALLET)
      .map((w) => ({ ...w, ...getWalletConnectStructure(walletConnectAccounts, w.id!) }));

  return wallets;
};
