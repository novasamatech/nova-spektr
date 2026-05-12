import { BN, BN_ZERO } from '@polkadot/util';
import { combine, createEvent, restore, sample } from 'effector';

import { type ClaimChunkWithAccountId } from '@/shared/api/governance';
import { type Asset, type Chain } from '@/shared/core';
import { type Form, createForm } from '@/shared/forms';
import { ZERO_BALANCE, getNativeAsset, nonNullable, nullable, transferableAmount } from '@/shared/lib/utils';
import { createComplexTxStore, createInitiatorsStore, createSignatoriesStore } from '@/shared/transactions';
import { type AnyAccount, accounts } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { locksService } from '@/entities/governance';
import { networkModel, networkUtils } from '@/entities/network';
import { transactionBuilder } from '@/entities/transaction';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { locksModel, networkSelectorModel, unlockModel } from '@/features/governance';
import { createSigningPathModel } from '@/features/signing-path';

type FormParams = {
  initiator: AnyAccount | null;
  signatory: AnyAccount | null;
  amount: string;
};

type FormSubmitEvent = FormParams & {
  chain: Chain;
  asset: Asset;
  fee: string;
  totalLock: BN;
  totalFee: string;
  multisigDeposit: string;
};

const formInitiated = createEvent<ClaimChunkWithAccountId[]>();
const formSubmitted = createEvent<FormSubmitEvent>();
const formCleared = createEvent();
const multisigDepositChanged = createEvent<string>();
const $multisigDeposit = restore(multisigDepositChanged, ZERO_BALANCE);

const $claims = restore(formInitiated, null);

const form: Form<FormParams> = createForm<FormParams>({
  validateOn: ['submit'],
  fields: {
    initiator: {
      defaultValue: null,
      validator: () => {
        return {
          source: combine({
            fee: $fee,
            isProxy: $isProxy,
            proxyBalance: $proxyBalance,
          }),
          fn: (_initiator, _fields, { fee, isProxy, proxyBalance }) => {
            if (isProxy) {
              if (new BN(fee).gt(new BN(proxyBalance))) {
                return { message: 'transfer.notEnoughBalanceForFeeError' };
              }
            }
          },
        };
      },
    },
    signatory: {
      defaultValue: null,
      validator: () => {
        return {
          source: combine({
            fee: $fee,
            isMultisig: $isMultisig,
            multisigDeposit: $multisigDeposit,
            signatoryBalance: $signatoryBalance,
          }),
          fn: (signatory, _fields, { fee, isMultisig, multisigDeposit, signatoryBalance }) => {
            if (nullable(signatory)) {
              return { message: 'transfer.noSignatoryError' };
            }

            const required = new BN(multisigDeposit).add(new BN(fee));
            if (isMultisig && required.gt(new BN(signatoryBalance))) {
              return { message: 'proxy.addProxy.notEnoughMultisigTokens' };
            }
          },
        };
      },
    },
    amount: {
      defaultValue: '',
      validator: () => {
        return {
          source: combine({
            fee: $fee,
            isMultisig: $isMultisig,
            availableBalance: $availableBalance,
          }),
          fn: (amount, fields, { fee, isMultisig, availableBalance }) => {
            const amountBN = new BN(amount);
            if (nullable(amount) || amountBN.lte(BN_ZERO)) {
              return { message: 'transfer.notZeroAmountError' };
            }
            if (!isMultisig && fields.initiator) {
              const feeBN = new BN(fee);
              if (amountBN.add(feeBN).gt(new BN(availableBalance))) {
                return { message: 'transfer.notEnoughBalanceForFeeError' };
              }
            }
          },
        };
      },
    },
  },
});

const $availableBalance = combine(
  {
    initiator: form.fields.initiator.$value,
    chain: networkSelectorModel.$governanceChain,
    balances: balanceModel.$balanceMap,
    accounts: accounts.$list,
  },
  ({ balances, chain, initiator }) => {
    if (nullable(initiator) || nullable(chain)) return BN_ZERO;

    const nativeAsset = getNativeAsset(chain.assets);
    const accountBalance = balanceUtils.getBalance(balances, initiator.accountId, chain.chainId, nativeAsset.assetId);
    if (!accountBalance) return BN_ZERO;

    return locksService.getAvailableBalance(accountBalance);
  },
);

const $signatories = createSignatoriesStore({
  chain: networkSelectorModel.$governanceChain,
  initiator: form.fields.initiator.$value,
  accounts: accounts.$list,
});

const { $signingPath, signingPathChanged, $signatoryFromPath, recomputeForSigner, $pathRoute } =
  createSigningPathModel({
    initiator: form.fields.initiator.$value,
    chain: networkSelectorModel.$governanceChain,
    resetOn: formInitiated,
    resetUserOverrideOn: form.fields.initiator.change,
  });

const $api = combine(
  {
    apis: networkModel.$apis,
    chainId: networkSelectorModel.$governanceChainId,
  },
  ({ apis, chainId }) => {
    return chainId ? (apis[chainId] ?? null) : null;
  },
);

const $isChainConnected = combine(
  {
    chainId: networkSelectorModel.$governanceChainId,
    statuses: networkModel.$connectionStatuses,
  },
  ({ chainId, statuses }) => {
    if (!chainId) return false;

    const status = statuses[chainId];
    if (nullable(status)) return false;

    return networkUtils.isConnectedStatus(status);
  },
);

const $coreTx = combine(
  {
    chain: networkSelectorModel.$governanceChain,
    initiator: form.fields.initiator.$value,
    signatory: form.fields.signatory.$value,
    isConnected: $isChainConnected,
    claims: $claims,
  },
  ({ chain, initiator, signatory, isConnected, claims }) => {
    if (nullable(chain) || nullable(initiator) || nullable(signatory) || nullable(claims) || !isConnected) return null;
    const claim = claims.find((claim) => claim.accountId === initiator.accountId);

    return transactionBuilder.buildUnlock({
      actions: claim?.actions ?? [],
      chain: chain,
      accountId: signatory.accountId,
      amount: claim?.amount.toString() ?? ZERO_BALANCE,
      target: initiator.accountId,
    });
  },
);

const { $fee, $pendingFee, $tx, $route } = createComplexTxStore({
  api: $api,
  chain: networkSelectorModel.$governanceChain,
  transaction: $coreTx,
  accounts: accounts.$list,
  initiator: form.fields.initiator.$value,
  signatory: form.fields.signatory.$value,
  routeOverride: $pathRoute,
});

const $proxyAccount = $route.map((route) => route.find((account) => accountUtils.isProxiedAccount(account)) ?? null);
const $isMultisig = $route.map((route) => route.some(accountUtils.isAnyMultisigAccount));
const $isProxy = $proxyAccount.map((account) => nonNullable(account));

const $proxyBalance = combine(
  {
    isProxy: $isProxy,
    proxyAccount: $proxyAccount,
    balances: balanceModel.$balanceMap,
    network: networkSelectorModel.$network,
  },
  ({ isProxy, proxyAccount, balances, network }) => {
    if (!isProxy || !network || !proxyAccount) return ZERO_BALANCE;

    const balance = balanceUtils.getBalance(
      balances,
      proxyAccount.accountId,
      network.chain.chainId,
      network.asset.assetId,
    );

    return transferableAmount(balance);
  },
);

const $proxyWallet = combine(
  {
    isProxy: $isProxy,
    proxyAccount: $proxyAccount,
    wallets: walletModel.$wallets,
  },
  ({ isProxy, proxyAccount, wallets }) => {
    if (!isProxy || !proxyAccount) return null;

    return walletUtils.getWalletById(wallets, proxyAccount.walletId);
  },
);

// Form's fields

sample({
  clock: formInitiated,
  target: form.reset,
});

sample({
  clock: [$signatoryFromPath, $signatories, formInitiated],
  source: { fromPath: $signatoryFromPath, signatories: $signatories },
  fn: ({ fromPath, signatories }) => fromPath ?? signatories.at(0) ?? null,
  target: form.fields.signatory.change,
});

sample({ clock: form.fields.signatory.$value, target: recomputeForSigner });

sample({
  clock: formInitiated,
  source: unlockModel.$totalUnlock,
  fn: (totalUnlock) => totalUnlock.toString(),
  target: form.fields.amount.change,
});

const $initiators = createInitiatorsStore({
  chain: networkSelectorModel.$governanceChain,
  accounts: walletSelect.$selectedAccounts,
});

sample({
  clock: formInitiated,
  source: $initiators,
  filter: (selectedAccounts, claims) =>
    nonNullable(claims) && nonNullable(selectedAccounts) && claims.length > 0 && selectedAccounts.length > 0,
  fn: (selectedAccounts, claims) =>
    selectedAccounts.find((account) => account.accountId === claims.at(0)?.accountId) ?? null,
  target: form.fields.initiator.change,
});

const $signatoryBalance = combine(
  {
    signatory: form.fields.signatory.$value,
    balances: balanceModel.$balanceMap,
    network: networkSelectorModel.$network,
  },
  ({ signatory, balances, network }) => {
    if (!signatory || !network) return ZERO_BALANCE;

    const balance = balanceUtils.getBalance(
      balances,
      signatory.accountId,
      network.chain.chainId,
      network.asset.assetId,
    );

    return transferableAmount(balance);
  },
);

const $canSubmit = combine(
  {
    isFormValid: form.$isValid,
    isFeeLoading: $pendingFee,
    initiator: form.fields.initiator.$value,
  },
  ({ isFormValid, isFeeLoading, initiator }) => {
    return isFormValid && !isFeeLoading && nonNullable(initiator);
  },
);

sample({
  clock: form.submit.doneData,
  source: {
    network: networkSelectorModel.$network,
    fee: $fee,
    multisigDeposit: $multisigDeposit,
    totalLock: locksModel.$totalLock,
  },
  filter: ({ network, fee }) => {
    return nonNullable(network) && nonNullable(fee);
  },
  fn: ({ network, fee, multisigDeposit, totalLock }, formData) => {
    return {
      initiator: formData.initiator,
      signatory: formData.signatory,
      amount: formData.amount,
      chain: network!.chain,
      asset: network!.asset,
      totalLock,
      fee: fee!.toString(),
      totalFee: fee!.toString(),
      multisigDeposit: multisigDeposit.toString(),
    } satisfies FormSubmitEvent;
  },
  target: formSubmitted,
});

sample({
  clock: formCleared,
  target: form.reset,
});

export const unlockFormAggregate = {
  form,

  $api,
  $canSubmit,
  $coreTx,
  $tx,
  $route,
  $fee,
  $pendingFee,
  $isProxy,
  $isMultisig,
  $proxyWallet,
  $signatories,
  $signingPath,
  $proxyBalance,
  $signatoryBalance,

  formInitiated,
  formCleared,
  multisigDepositChanged,
  signingPathChanged,
  formSubmitted,
};
