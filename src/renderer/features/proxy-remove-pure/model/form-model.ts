import { type ApiPromise } from '@polkadot/api';
import { BN, BN_ZERO } from '@polkadot/util';
import { combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { createGate } from 'effector-react';

import {
  type Address,
  type Chain,
  type ProxiedAccount,
  type ProxyType,
  TransactionType,
  type Wallet,
} from '@/shared/core';
import { type Form, createForm } from '@/shared/forms';
import { getNativeAsset, nonNullable, withdrawableAmountBN } from '@/shared/lib/utils';
import { proxyPallet } from '@/shared/pallet/proxy';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { createComplexTxStore, createMultisigDeposit, createSignatoriesStore } from '@/shared/transactions';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { accountUtils } from '@/entities/wallet';

type FormParams = {
  signatory: AnyAccount | null;
};

type Input = {
  chain: Chain;
  account: AnyAccount | null;
  proxiedAccount: ProxiedAccount | null;
  spawner: Address;
  proxyType: ProxyType;
};

const flow = createGate<{ wallet: Wallet | null }>({ defaultState: { wallet: null } });

const formInitiated = createEvent<Input>();
const formSubmitted = createEvent<FormParams>();

const $wallet = flow.state.map(({ wallet }) => wallet);

const $formStore = restore(formInitiated, null);

const $activeProxiesForAccount = createStore<AccountId[]>([]);

const $chain = $formStore.map((store) => (store ? store.chain : null));
const $proxiedAccount = $formStore.map((store) => (store ? store.proxiedAccount : null));

const $isPureProxied = $proxiedAccount.map((proxied) => {
  if (!proxied) return false;

  return accountUtils.isPureProxiedAccount(proxied);
});

const $isPureProxiedNeedToBeKilled = combine(
  {
    isPureProxied: $isPureProxied,
    activeProxies: $activeProxiesForAccount,
  },
  ({ isPureProxied, activeProxies }) => isPureProxied && activeProxies.length === 1,
);

const form: Form<FormParams> = createForm<FormParams>({
  fields: {
    signatory: {
      defaultValue: null,
      validator: () => {
        return {
          source: combine({
            fee: $fee,
            multisigDeposit: $multisigDeposit,
            balances: balanceModel.$balances,
            signatories: $signatories,
            chain: $chain,
          }),
          fn: (signatory, _f, { balances, chain, fee, multisigDeposit }) => {
            if (!signatory) {
              return { message: 'proxy.addProxy.noSignatoryError' };
            }

            const signatoryBalance = balanceUtils.getBalance(
              balances,
              signatory.accountId,
              chain.chainId,
              getNativeAsset(chain.assets).assetId.toString(),
            );

            const hasEnoughTokens = new BN(multisigDeposit)
              .add(new BN(fee))
              .lte(withdrawableAmountBN(signatoryBalance));

            if (!hasEnoughTokens) {
              return { message: 'proxy.addProxy.notEnoughMultisigTokens' };
            }
          },
        };
      },
    },
  },
  validateOn: ['submit'],
});

const $walletAccounts = combine(
  {
    wallet: $wallet,
    accounts: accounts.$list,
  },
  ({ wallet, accounts }) => {
    if (!wallet) return [];

    return accountService.filterAccountsByWallet(accounts, wallet.id);
  },
);

const $api = combine(
  {
    apis: networkModel.$apis,
    chain: $chain,
  },
  ({ apis, chain }) => {
    if (!chain) return null;

    return apis[chain.chainId] ?? null;
  },
);

const $signatories = createSignatoriesStore({
  initiator: $proxiedAccount,
  chain: $chain,
  accounts: accounts.$list,
});

//todo flowStarted effect from chain on actual proxy connection
//and if its the last one then killPure and that connection
//is the real one that we want to delete mafucka bi4

const $coreTx = combine(
  {
    signatory: form.fields.signatory.$value,
    proxiedAccount: $proxiedAccount,
    data: $formStore,
  },
  ({ signatory, proxiedAccount, data }) => {
    console.log('HUY228', { signatory, proxiedAccount, data });
    if (!signatory || !data || !proxiedAccount) return null;

    return {
      chainId: proxiedAccount.chainId,
      accountId: signatory.accountId,
      type: TransactionType.REMOVE_PURE_PROXY,
      args: {
        spawner: data!.spawner,
        proxyType: data!.proxyType,
        index: 0,
        height: proxiedAccount.blockNumber,
        extIndex: proxiedAccount.extrinsicIndex,
      },
    };
  },
);

const { $fee, $pendingFee, $tx, $route } = createComplexTxStore({
  api: $api,
  chain: $chain,
  transaction: $coreTx,
  accounts: accounts.$list,
  initiator: $proxiedAccount,
  signatory: form.fields.signatory.$value,
});

const $multisigThreshold = $route.map((route) => {
  const multisig = route.find(accountUtils.isMultisigAccount);
  if (!multisig) return null;

  return multisig.threshold;
});

const { $multisigDeposit, $pending: $pendingMultisigDeposit } = createMultisigDeposit({
  $threshold: $multisigThreshold,
  $api: $api,
});

const $isMultisig = $multisigDeposit.map((deposit) => deposit.gt(BN_ZERO));

const $canSubmit = combine(
  {
    isFormValid: form.$isValid,
    isFeeLoading: $pendingFee,
  },
  ({ isFormValid, isFeeLoading }) => isFormValid && !isFeeLoading,
);

type ProxyParams = {
  api: ApiPromise;
  accountId: AccountId;
};
const getAccountProxiesFx = createEffect(async ({ api, accountId }: ProxyParams) => {
  return await proxyPallet.storage.proxies(api, [accountId]);
});

sample({
  clock: formInitiated,
  target: form.reset,
});

sample({
  clock: formInitiated,
  source: $signatories,
  filter: (signatories) => signatories.length < 2,
  fn: (signatories) => signatories.at(0)!,
  target: form.fields.signatory.change,
});

sample({
  clock: formInitiated,
  source: {
    signatories: $signatories,
  },
  filter: ({ signatories }) => signatories.length < 2,
  fn: ({ signatories }) => ({
    signatory: signatories.at(0)!,
  }),
  target: formSubmitted,
});

sample({
  clock: getAccountProxiesFx.done,
  fn: ({ result, params }) => {
    const proxies = result.find((el) => el.account === params.accountId)?.value.proxies;

    if (!proxies) return [];

    return proxies.map((el) => el.delegate);
  },
  target: $activeProxiesForAccount,
});

// Submit

sample({
  clock: form.submit.doneData,
  source: {
    chain: $chain,
    account: $proxiedAccount,
  },
  filter: ({ chain, account }) => nonNullable(chain) && nonNullable(account),
  fn: (_, formData) => formData,
  target: formSubmitted,
});

export const formModel = {
  form,
  $wallet,
  $proxiedAccount,
  $signatories,
  $walletAccounts,

  $activeProxiesForAccount,
  $multisigDeposit,
  $fee,
  $pendingFee,
  $pendingMultisigDeposit,
  $isMultisig,
  $isPureProxiedNeedToBeKilled,

  $tx,
  $coreTx,

  $api,
  $canSubmit,

  getAccountProxiesFx,

  flow,

  formInitiated,
  formSubmitted,
};
