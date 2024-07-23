import { BN } from '@polkadot/util';
import { combine, createEvent, createStore, restore, sample } from 'effector';
import { createForm } from 'effector-forms';

import { type UnlockChunk } from '@/shared/api/governance';
import { type Account } from '@/shared/core';
import { ZERO_BALANCE } from '@/shared/lib/utils';
import { networkModel, networkUtils } from '@/entities/network';
import { transactionBuilder, transactionService } from '@/entities/transaction';
import { UnlockRules } from '../lib/unlock-rules';
import { networkSelectorModel } from '../model/networkSelector';
import { confirmModel } from '../model/unlock/confirm-model';

type Input = {
  id?: number;
  unlockableClaims: UnlockChunk[];
  amount: string;
};

type FormParams = {
  shards: Account[];
  signatory: Account;
  amount: string;
  description: string;
};

const formInitiated = createEvent<Input>();
const formSubmitted = createEvent();

const feeChanged = createEvent<string>();
const totalFeeChanged = createEvent<string>();
const multisigDepositChanged = createEvent<string>();
const isFeeLoadingChanged = createEvent<boolean>();

const $accountsBalances = createStore<string[]>([]);
const $signatoryBalance = createStore<string>(ZERO_BALANCE);
const $proxyBalance = createStore<string>(ZERO_BALANCE);

const $fee = restore(feeChanged, ZERO_BALANCE);
const $multisigDeposit = restore(multisigDepositChanged, ZERO_BALANCE);
const $isFeeLoading = restore(isFeeLoadingChanged, true);

const $confirmForm = createForm<FormParams>({
  fields: {
    shards: {
      init: [] satisfies Account[],
      rules: [
        {
          name: 'noProxyFee',
          source: combine({
            fee: $fee,
            isProxy: confirmModel.$isProxy,
            proxyBalance: $proxyBalance,
          }),
          validator: (_s, _f, { isProxy, proxyBalance, fee }) => {
            if (!isProxy) return true;

            return new BN(fee).lte(new BN(proxyBalance));
          },
        },
      ],
    },
    signatory: {
      init: {} as Account,
      rules: [
        {
          name: 'noSignatorySelected',
          errorText: 'transfer.noSignatoryError',
          source: confirmModel.$isMultisig,
          validator: (signatory, _, isMultisig) => {
            if (!isMultisig) return true;

            return Object.keys(signatory).length > 0;
          },
        },
        {
          name: 'notEnoughTokens',
          errorText: 'proxy.addProxy.notEnoughMultisigTokens',
          source: combine({
            fee: $fee,
            isMultisig: confirmModel.$isMultisig,
            multisigDeposit: $multisigDeposit,
            signatoryBalance: $signatoryBalance,
          }),
          validator: (_s, _f, { fee, isMultisig, signatoryBalance, multisigDeposit }) => {
            if (!isMultisig) return true;

            return new BN(multisigDeposit).add(new BN(fee)).lte(new BN(signatoryBalance));
          },
        },
      ],
    },
    amount: {
      init: '',
      rules: [
        {
          name: 'required',
          errorText: 'transfer.requiredAmountError',
          validator: Boolean,
        },
        {
          name: 'notZero',
          errorText: 'transfer.notZeroAmountError',
          validator: (value) => value !== ZERO_BALANCE,
        },
        {
          name: 'insufficientBalanceForFee',
          errorText: 'transfer.notEnoughBalanceForFeeError',
          source: combine({
            fee: $fee,
            isMultisig: confirmModel.$isMultisig,
            accountsBalances: $accountsBalances,
          }),
          validator: (value, form, { fee, isMultisig, accountsBalances }) => {
            if (isMultisig) return true;

            return form.shards.every((_: Account, index: number) => {
              return new BN(fee).lte(new BN(accountsBalances[index].balance));
            });
          },
        },
      ],
    },
    description: {
      init: '',
      rules: [UnlockRules.description.maxLength],
    },
  },
  validateOn: ['submit'],
});

const $isChainConnected = combine(
  {
    chain: networkSelectorModel.$governanceChain,
    statuses: networkModel.$connectionStatuses,
  },
  ({ chain, statuses }) => {
    if (!chain) return false;

    return networkUtils.isConnectedStatus(statuses[chain.chainId]);
  },
);

const $pureTxs = combine(
  {
    chain: networkSelectorModel.$governanceChain,
    form: $confirmForm.$values,
    isConnected: $isChainConnected,
  },
  ({ chain, form, isConnected }) => {
    if (!chain || !isConnected) return undefined;

    return form.shards.map((shard) => {
      return transactionBuilder.buildWithdraw({
        chain,
        accountId: shard.accountId,
      });
    });
  },
  { skipVoid: false },
);

const $transactions = combine(
  {
    apis: networkModel.$apis,
    chain: networkSelectorModel.$governanceChain,
    pureTxs: $pureTxs,
    txWrappers: confirmModel.$txWrappers,
  },
  ({ apis, chain, pureTxs, txWrappers }) => {
    if (!chain || !pureTxs) return undefined;

    return pureTxs.map((tx) =>
      transactionService.getWrappedTransaction({
        api: apis[chain.chainId],
        addressPrefix: chain.addressPrefix,
        transaction: tx,
        txWrappers,
      }),
    );
  },
  { skipVoid: false },
);

sample({
  clock: formInitiated,
  target: $confirmForm.reset,
});

sample({
  clock: formInitiated,
  source: confirmModel.$shards,
  filter: (shards) => shards.length > 0,
  target: $confirmForm.fields.shards.onChange,
});

const $canSubmit = combine(
  {
    isFormValid: $confirmForm.$isValid,
    isFeeLoading: $isFeeLoading,
  },
  ({ isFormValid, isFeeLoading }) => {
    return isFormValid && !isFeeLoading;
  },
);

export const unlockConfirmAggregate = {
  $confirmForm,
  $canSubmit,
  $transactions,

  events: {
    formInitiated,
    feeChanged,
    totalFeeChanged,
    multisigDepositChanged,
    isFeeLoadingChanged,
  },

  output: {
    formSubmitted,
  },
};
