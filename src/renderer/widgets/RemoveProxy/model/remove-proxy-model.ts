import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { combine, createEvent, createStore, sample } from 'effector';
import { spread } from 'patronum';

import { Account, Chain, HexString, ProxyAccount } from '@shared/core';
import { accountUtils, walletModel, walletUtils } from '@entities/wallet';
import { dictionary } from '@shared/lib/utils';
import { getSignatoryAccounts } from '@pages/Operations/common/utils';
import { proxyModel } from '@entities/proxy';

export const enum Step {
  CONFIRMATION,
  SIGNING,
  SUBMIT,
}

type FlowStartedProps = {
  chain: Chain;
  proxyAccount: ProxyAccount;
};
const flowStarted = createEvent<FlowStartedProps>();

const $chain = createStore<Chain | null>(null);
const $proxyAccount = createStore<ProxyAccount | null>(null);
const $activeStep = createStore<Step>(Step.CONFIRMATION).reset(flowStarted);
const $signatory = createStore<Account | null>(null).reset(flowStarted);

const $unsignedTx = createStore<UnsignedTransaction | null>(null).reset(flowStarted);
const $signature = createStore<HexString | null>(null).reset(flowStarted);

const $proxiedAccount = combine(
  {
    wallets: walletModel.$wallets,
    accounts: walletModel.$accounts,
    proxyAccount: $proxyAccount,
  },
  ({ wallets, accounts, proxyAccount }) => {
    if (!proxyAccount) return null;

    const walletsMap = dictionary(wallets, 'id');

    return (
      accounts.find(
        (a) => a.accountId === proxyAccount.proxiedAccountId && !walletUtils.isWatchOnly(walletsMap[a.walletId]),
      ) || null
    );
  },
  {
    skipVoid: false,
  },
);

const $proxiedWallet = combine(
  {
    wallets: walletModel.$wallets,
    proxiedAccount: $proxiedAccount,
  },
  ({ wallets, proxiedAccount }) => {
    if (!proxiedAccount) return null;

    return wallets.find((w) => w.id === proxiedAccount.walletId) || null;
  },
  {
    skipVoid: false,
  },
);

const $signatories = combine(
  {
    wallets: walletModel.$wallets,
    accounts: walletModel.$accounts,
    proxiedAccount: $proxiedAccount,
    chain: $chain,
  },
  ({ wallets, accounts, proxiedAccount, chain }) => {
    if (!chain || !proxiedAccount) return null;

    return accountUtils.isMultisigAccount(proxiedAccount)
      ? getSignatoryAccounts(accounts, wallets, [], proxiedAccount.signatories, chain.chainId)
      : null;
  },
  {
    skipVoid: false,
  },
);

const signatorySelected = createEvent<Account>();
const activeStepChanged = createEvent<Step>();

type TransactionSignedProps = {
  signature: HexString;
  unsignedTx: UnsignedTransaction;
};
const transactionSigned = createEvent<TransactionSignedProps>();
const proxyRemoved = createEvent();

sample({
  source: flowStarted,
  target: spread({
    targets: { chain: $chain, proxyAccount: $proxyAccount },
  }),
});

sample({
  source: transactionSigned,
  target: spread({
    targets: { unsignedTx: $unsignedTx, signature: $signature },
  }),
});

sample({
  clock: transactionSigned,
  fn: () => Step.SUBMIT,
  target: $activeStep,
});

sample({
  source: signatorySelected,
  target: $signatory,
});

sample({
  source: signatorySelected,
  fn: () => Step.SIGNING,
  target: $activeStep,
});

sample({
  source: activeStepChanged,
  target: $activeStep,
});

sample({
  clock: proxyRemoved,
  source: $proxyAccount,
  filter: (proxyAccount) => Boolean(proxyAccount),
  fn: (proxyAccount) => [proxyAccount!],
  target: proxyModel.events.proxiesRemoved,
});

export const removeProxyModel = {
  $chain,
  $proxiedWallet,
  $proxiedAccount,
  $proxyAccount,
  $activeStep,
  $unsignedTx,
  $signature,
  $signatories,
  $signatory,
  events: {
    flowStarted,
    signatorySelected,
    transactionSigned,
    activeStepChanged,
    proxyRemoved,
  },
};
