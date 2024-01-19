import { createEvent, createStore, sample, createEffect } from 'effector';

import { Step } from '../lib/types';
import { addProxyUtils } from '../lib/add-proxy-utils';

export type Callbacks = {
  onClose: () => void;
};

const stepChanged = createEvent<Step>();

const $step = createStore<Step>(Step.INIT);

// const subscribeBalancesFx = createEffect(() => {
//   console.log('=== Sub');
// });

const unsubscribeBalancesFx = createEffect(() => {
  console.log('=== Unsub');
});

// sample({
//   clock: walletSelectModel.$walletForDetails,
//   source: walletSelectModel.$walletForDetails,
//   target: balanceModel.$balancesBuffer,
// });

// TODO: also check that subs is already active
// sample({
//   clock: $step,
//   source: {
//     chains: networkModel.$chains,
//     wallets: walletModel.$wallets,
//     wallet: walletSelectModel.$walletForDetails,
//     activeWallet: walletModel.$activeWallet,
//     accounts: walletModel.$accounts,
//   },
//   filter: ({ wallet, activeWallet }, step) => {
//     const isWalletExist = Boolean(wallet);
//     const isInitStep = addProxyUtils.isInitStep(step);
//     const isActiveWallet = wallet === activeWallet;
//
//     return isWalletExist && isInitStep && !isActiveWallet;
//   },
//   fn: ({ chains, wallets, wallet, accounts }) => {
//     const proxyChains = Object.values(chains).filter((chain) => isRegularProxyAvailable(chain.options));
//
//     const chainAccountsMap = proxyChains.reduce<Record<ChainId, Account[]>>((acc, chain) => {
//       const chainAccounts = accountUtils.getAccountsForBalances(wallets, accounts, (account) => {
//         return accountUtils.isChainIdMatch(account, chain.chainId);
//       });
//       chainAccounts.
//       // acc[chain.chainId] = accountUtils.getAccountsForBalances(wallets, accounts, chain.chainId);
//
//
//       return acc;
//     }, {});
//
//
//     const accountsToSub = accounts.forEach((account) => {
//       if (accountUtils.isMultisigAccount(account)) {
//         account.signatories.forEach((signatory) => {
//           if (accountsMap[signatory.accountId]) {
//             subscriptionAccounts.push(accountsMap[signatory.accountId]);
//           }
//         });
//       }
//
//       // TODO: Add same for proxied accounts https://app.clickup.com/t/86934k047
//     });
//
//     return 1;
//   },
//   target: subscribeBalancesFx,
// });

sample({
  clock: $step,
  filter: (step) => addProxyUtils.isSubmitStep(step),
  target: unsubscribeBalancesFx,
});

sample({ clock: stepChanged, target: $step });

export const addProxyModel = {
  $step,
  events: {
    stepChanged,
  },
};
