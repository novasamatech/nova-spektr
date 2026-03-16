import { combine, createEvent, createStore, restore, sample } from 'effector';
import { persist } from 'effector-storage/local';

import { type Chain } from '@/shared/core';
import { createFlow } from '@/shared/effector';
import { getNativeAsset, nullable, withdrawableAmountBN } from '@/shared/lib/utils';
import { Paths } from '@/shared/routes';
import { createInitiatorsStore } from '@/shared/transactions';
import { type AnyAccount, accountService } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { walletSelect } from '@/aggregates/wallet-select';
import { navigationModel } from '@/features/navigation';

const flow = createFlow<{ chain: Chain | null }>({ chain: null });
const $selectedChain = flow.state.map((state) => state.chain);

const selectAccount = createEvent<AnyAccount>();
const $selectedAccount = restore<AnyAccount | null>(selectAccount, null).reset(flow.close);

const $initiators = createInitiatorsStore({
  chain: $selectedChain,
  accounts: walletSelect.$selectedAccounts,
});

const $chainAccounts = combine(
  {
    selectedAccounts: $initiators,
    chain: $selectedChain,
    balances: balanceModel.$balanceMap,
  },
  ({ selectedAccounts, chain, balances }) => {
    if (selectedAccounts.length === 0 || nullable(chain)) return [];
    if (selectedAccounts.length === 1) return selectedAccounts;

    const filteredAccount = selectedAccounts.filter(
      (acc) => accountService.isChainAccount(acc) && accountService.isAccountAvailableOnChain(acc, chain),
    );

    return filteredAccount.map((account) => ({
      ...account,
      balance: withdrawableAmountBN(
        balanceUtils.getBalance(balances, account.accountId, chain.chainId, getNativeAsset(chain.assets).assetId),
      ),
    }));
  },
);

sample({
  source: $chainAccounts,
  filter: (accounts) => accounts.length === 1,
  fn: (accounts) => accounts!.at(0) ?? null,
  target: $selectedAccount,
});

// Show popup

const saveLegacyFormatViewed = createEvent<boolean>();
const $legacyFormatViewed = createStore(false);

persist({ key: 'legacy_format_viewed', store: $legacyFormatViewed, sync: true });

$legacyFormatViewed.on(saveLegacyFormatViewed, (_, value) => value);

const $showPopup = $legacyFormatViewed.map((v) => !v);

// Navigation

sample({
  clock: flow.close,
  fn: () => Paths.ASSETS,
  target: navigationModel.events.navigateTo,
});

export const receiveModel = {
  $chainAccounts,
  $selectedAccount,
  $showPopup,

  selectAccount,
  saveLegacyFormatViewed,

  flow,
};
