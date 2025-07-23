import { type ApiPromise } from '@polkadot/api';
import { attach, combine, createEvent, createStore, sample } from 'effector';
import { sortBy } from 'lodash';
import { spread } from 'patronum';

import { AccountType, CryptoType, type NoID, ProxyVariant, SigningType, WalletType } from '@/shared/core';
import { type FlexibleMultisigAccount, type FlexibleProxiedAccount } from '@/shared/core/types/account';
import { Step, nonNullable, nullable, toAccountId } from '@/shared/lib/utils';
import { createComplexTxStore } from '@/shared/transactions';
import { accounts } from '@/domains/network';
import { networkUtils } from '@/entities/network';
import { transactionBuilder } from '@/entities/transaction';
import { walletModel } from '@/entities/wallet';
import { signModel } from '@/features/operations/OperationSign';
import { submitModel, submitUtils } from '@/features/operations/OperationSubmit';

import { confirmModel } from './confirm-model';
import { flexibleMultisigFeature } from './feature';
import { flexibleMultisigModel } from './flexible-multisig-create';
import { formModel } from './form-model';
import { signatoryModel } from './signatory-model';
import { walletProviderModel } from './wallet-provider-model';

const $api = combine(flexibleMultisigFeature.state, (state): ApiPromise | null => {
  if (state.status !== 'running') return null;
  return state.data.api;
});

const $confirmMeta = confirmModel.$confirmMap.map(s => (nonNullable(s[0]) ? s[0].meta : null));
const $signer = $confirmMeta.map(m => (nonNullable(m) ? m.signatory : null));

const $coreTx = combine(
  {
    meta: $confirmMeta,
    signatories: signatoryModel.$signatories,
    proxyAddress: confirmModel.$proxyAddress,
  },
  ({ signatories, meta, proxyAddress }) => {
    if (nullable(meta) || nullable(proxyAddress)) return null;
    const { chain, totalDeposit, threshold, signatory, multisigAccountId } = meta;

    const signatoriesWrapped = signatories
      .filter(a => a.address !== '')
      .map(s => ({ accountId: toAccountId(s.address), address: s.address }));

    return transactionBuilder.buildCreateFlexibleMultisig({
      chain,
      signerAccountId: signatory.accountId,
      signatories: signatoriesWrapped,
      multisigAccountId: toAccountId(multisigAccountId),
      threshold,
      proxyAccountId: toAccountId(proxyAddress),
      proxyDeposit: totalDeposit,
    });
  },
);

// Second operation
const { $tx } = createComplexTxStore({
  api: $api,
  initiator: $confirmMeta.map(m => (nonNullable(m) ? m.initiator : null)),
  signatory: $signer,
  accounts: accounts.$list,
  chain: formModel.$chain,
  transaction: $coreTx,
});

const startSigningFlexible = createEvent();

sample({
  clock: startSigningFlexible,
  source: {
    chain: formModel.$chain,
    tx: $tx,
    signer: $signer,
  },
  filter: ({ chain, tx, signer }) => nonNullable(chain) && nonNullable(tx) && nonNullable(signer),
  fn: ({ chain, tx, signer }) => ({
    event: {
      signingPayloads: [
        {
          chain: chain!,
          account: signer!,
          transaction: tx!,
          signatory: signer,
        },
      ],
    },
    step: Step.SIGN,
  }),
  target: spread({
    event: signModel.events.formInitiated,
    step: flexibleMultisigModel.stepChanged,
  }),
});

sample({
  clock: signModel.output.formSubmitted,
  source: {
    chain: formModel.$chain,
    coreTx: $coreTx,
    tx: $tx,
    signer: $signer,
  },
  filter: ({ chain, coreTx, tx, signer }) => {
    return nonNullable(chain) && nonNullable(tx) && nonNullable(coreTx) && nonNullable(signer);
  },
  fn: ({ coreTx, tx, chain, signer }, signParams) => {
    return {
      event: {
        ...signParams,
        chain: chain!,
        account: signer!,
        coreTxs: [coreTx!],
        wrappedTxs: [tx!],
      },
      step: Step.SUBMIT,
    };
  },
  target: spread({
    event: submitModel.events.formInitiated,
    step: flexibleMultisigModel.stepChanged,
  }),
});

const $flexibleMultisigCreated = createStore<boolean>(false);

sample({
  clock: submitModel.output.formSubmitted,
  source: {
    tx: $tx,
    accounts: accounts.$list,
  },
  filter: ({ tx }, results) => nonNullable(tx) && results.some(({ result }) => submitUtils.isSuccessResult(result)),
  fn: () => true,
  target: $flexibleMultisigCreated,
});

// Create wallet

const createWalletFx = attach({ effect: walletModel.createWallet });

sample({
  clock: submitModel.output.formSubmitted,
  source: {
    name: formModel.form.fields.name.$value,
    threshold: formModel.form.fields.threshold.$value,
    signatories: signatoryModel.$signatories,
    chain: formModel.$chain,
    flexibleMultisigCreated: $flexibleMultisigCreated,
    multisigAccountId: formModel.$multisigAccountId,
    proxyAddress: confirmModel.$proxyAddress,
  },
  filter: ({ flexibleMultisigCreated, chain, multisigAccountId, proxyAddress }) => {
    return nonNullable(chain) && flexibleMultisigCreated && nonNullable(multisigAccountId) && nonNullable(proxyAddress);
  },
  fn: ({ signatories, chain, name, threshold, multisigAccountId, proxyAddress }) => {
    const sortedSignatories = sortBy(
      signatories.map(a => ({ address: a.address, accountId: toAccountId(a.address) })),
      'accountId',
    );

    const isEthereumChain = networkUtils.isEthereumBased(chain!.options);

    const multisigAccount: Omit<NoID<FlexibleMultisigAccount>, 'walletId'> = {
      signatories: sortedSignatories,
      name: name.trim(),
      accountId: multisigAccountId!,
      threshold: threshold,
      cryptoType: isEthereumChain ? CryptoType.ETHEREUM : CryptoType.SR25519,
      signingType: SigningType.MULTISIG,
      accountType: AccountType.FLEX_MULTISIG,
      type: 'universal',
    };

    const pureAccount: Omit<NoID<FlexibleProxiedAccount>, 'walletId'> = {
      name: name.trim(),
      accountId: toAccountId(proxyAddress!),
      accountType: AccountType.FLEX_PROXIED,
      type: 'chain',
      signingType: SigningType.WATCH_ONLY,
      cryptoType: isEthereumChain ? CryptoType.ETHEREUM : CryptoType.SR25519,
      proxyAccountId: multisigAccountId!,
      delay: 0,
      proxyType: 'Any',
      proxyVariant: ProxyVariant.PURE,
      chainId: chain!.chainId,
    };

    return {
      wallet: {
        name,
        type: WalletType.FLEXIBLE_MULTISIG,
        signingType: SigningType.MULTISIG,
      },
      accounts: [pureAccount, multisigAccount],
    };
  },
  target: createWalletFx,
});

sample({
  clock: createWalletFx.doneData.filter({ fn: nonNullable }),
  fn: ({ wallet }) => wallet.id,
  target: walletProviderModel.events.completed,
});

export const assignModel = {
  $flexibleMultisigCreated,

  startSigningFlexible,
};
