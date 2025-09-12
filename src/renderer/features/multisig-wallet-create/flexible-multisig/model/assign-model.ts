import { type ApiPromise } from '@polkadot/api';
import { attach, combine, createEffect, createEvent, createStore, sample } from 'effector';
import { sortBy } from 'lodash';
import { spread } from 'patronum';
import { z } from 'zod';

import {
  AccountType,
  CryptoType,
  type FlexibleMultisigWallet,
  type MultisigWallet,
  type NoID,
  type ProxiedAccount,
  type ProxiedWallet,
  ProxyVariant,
  SigningType,
  WalletType,
} from '@/shared/core';
import {
  type FlexibleMultisigAccount,
  type FlexibleProxiedAccount,
  type MultisigAccount,
} from '@/shared/core/types/account';
import { Step, assert, nonNullable, nullable, toAccountId, toAddress, toShortAddress } from '@/shared/lib/utils';
import { polkadotjsHelpers } from '@/shared/polkadotjs-helpers';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { createComplexTxStore } from '@/shared/transactions';
import { type AnyAccount, accounts } from '@/domains/network';
import { networkUtils } from '@/entities/network';
import { type ExtrinsicResultParams } from '@/entities/transaction';
import { transactionBuilder } from '@/entities/transaction';
import { walletModel } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { signModel } from '@/features/operations/OperationSign';
import { submitModel, submitUtils } from '@/features/operations/OperationSubmit';

import { flexibleMultisigFeature } from './feature';
import { flexibleMultisigModel } from './flexible-multisig-create';
import { formModel } from './form-model';
import { signatoryModel } from './signatory-model';

const $api = combine(flexibleMultisigFeature.state, (state): ApiPromise | null => {
  if (state.status !== 'running') return null;
  return state.data.api;
});

const $proxyAddress = createStore<AccountId | null>(null).reset(flexibleMultisigModel.flow.close);

type SubscribePureEvent = {
  api: ApiPromise;
  signatory: AnyAccount;
};

const subscribePureEventFx = createEffect(({ api, signatory }: SubscribePureEvent): Promise<AccountId> => {
  return new Promise(resolve => {
    const eventSchema = z.object({
      proxyType: z.string(),
      who: z.string(),
      pure: z.string(),
    });

    const unsubscribe = polkadotjsHelpers.subscribeSystemEvents(
      { api, section: `proxy`, methods: ['PureCreated'] },
      event => {
        if (!api) return unsubscribe.then(fn => fn());
        const data = eventSchema.parse(event.data.toHuman());
        const accountId = toAccountId(data.who);

        if (!data || signatory.accountId !== accountId) return;

        unsubscribe.then(fn => fn());
        resolve(toAccountId(data.pure));
      },
    );
  });
});

sample({
  clock: submitModel.output.formSubmitted,
  source: {
    api: $api,
    initiator: flexibleMultisigModel.$initiator,
    proxyAddress: $proxyAddress,
  },
  filter: ({ api, initiator, proxyAddress }, results) => {
    return (
      nonNullable(api) &&
      nullable(proxyAddress) &&
      nonNullable(initiator) &&
      results.some(({ result }) => submitUtils.isSuccessResult(result))
    );
  },
  fn: ({ api, initiator }) => {
    return {
      api: api!,
      signatory: initiator!,
    };
  },
  target: subscribePureEventFx,
});

sample({
  clock: subscribePureEventFx.doneData,
  target: $proxyAddress,
});

// Second transaction
const $coreTx = combine(
  {
    signatory: flexibleMultisigModel.$signer,
    totalDeposit: flexibleMultisigModel.$totalDeposit,
    isMultisigExists: formModel.$multisigAlreadyExists,
    threshold: formModel.form.fields.threshold.$value,
    chain: formModel.$chain,
    multisigAccountId: formModel.$multisigAccountId,
    signatories: signatoryModel.$signatories,
    proxyAddress: $proxyAddress,
  },
  ({ signatories, chain, threshold, signatory, multisigAccountId, proxyAddress, totalDeposit, isMultisigExists }) => {
    if (
      nullable(multisigAccountId) ||
      nullable(signatory) ||
      nullable(chain) ||
      nullable(totalDeposit) ||
      nullable(proxyAddress)
    ) {
      return null;
    }
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
      proxyDeposit: totalDeposit.toString(),
      isMultisigExists,
    });
  },
);

const { $tx } = createComplexTxStore({
  api: $api,
  initiator: flexibleMultisigModel.$initiator,
  signatory: flexibleMultisigModel.$signer,
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
    signatory: flexibleMultisigModel.$signer,
    initiator: flexibleMultisigModel.$initiator,
  },
  filter: ({ chain, tx, signatory, initiator }) =>
    nonNullable(chain) && nonNullable(tx) && nonNullable(signatory) && nonNullable(initiator),
  fn: ({ chain, tx, signatory, initiator }) => ({
    event: {
      signingPayloads: [
        {
          chain: chain!,
          account: initiator!,
          transaction: tx!,
          signatory,
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
  clock: signModel.signed,
  source: $tx,
  filter: tx => nonNullable(tx),
  fn: (_, payload) => ({ event: payload, step: Step.SUBMIT }),
  target: spread({
    event: submitModel.init,
    step: flexibleMultisigModel.stepChanged,
  }),
});

const flexibleMultisigCreated = createEvent();
const $flexibleMultisigCreated = createStore<boolean>(false)
  .reset(flexibleMultisigModel.flow.close)
  .on(flexibleMultisigCreated, () => true);

sample({
  clock: submitModel.output.formSubmitted,
  source: {
    tx: $tx,
    accounts: accounts.$list,
  },
  filter: ({ tx }, results) => nonNullable(tx) && results.some(({ result }) => submitUtils.isSuccessResult(result)),
  target: flexibleMultisigCreated,
});

// Create wallet

const createFlexibleMultisigWalletFx = attach({ effect: walletModel.createWallet });
const createProxiedWalletFx = attach({ effect: walletModel.createWallet });
const createMultisigWalletFx = attach({ effect: walletModel.createWallet });

sample({
  clock: submitModel.output.formSubmitted,
  source: {
    name: formModel.form.fields.name.$value,
    threshold: formModel.form.fields.threshold.$value,
    signatories: signatoryModel.$signatories,
    chain: formModel.$chain,
    flexibleMultisigCreated: $flexibleMultisigCreated,
    multisigAccountId: formModel.$multisigAccountId,
    proxyAddress: $proxyAddress,
  },
  filter: ({ flexibleMultisigCreated, chain, multisigAccountId, proxyAddress }) => {
    return nonNullable(chain) && flexibleMultisigCreated && nonNullable(multisigAccountId) && nonNullable(proxyAddress);
  },
  fn: ({ signatories, chain, name, threshold, multisigAccountId, proxyAddress }, results) => {
    const successResult = results.find(({ result }) => submitUtils.isSuccessResult(result));
    assert(successResult, 'Successful result for flexible multisig creation was not found');

    const timepoint = (successResult.params as ExtrinsicResultParams).timepoint;
    const sortedSignatories = sortBy(
      signatories.map(a => ({ address: a.address, accountId: toAccountId(a.address), walletId: a.walletId })),
      'accountId',
    );

    const isEthereumChain = networkUtils.isEthereumBased(chain!.options);

    const multisigAccount: Omit<NoID<FlexibleMultisigAccount>, 'walletId'> = {
      signatories: sortedSignatories,
      name: `${name.trim()} Multisig`,
      accountId: multisigAccountId!,
      threshold: threshold,
      cryptoType: isEthereumChain ? CryptoType.ETHEREUM : CryptoType.SR25519,
      signingType: SigningType.MULTISIG,
      accountType: AccountType.FLEX_MULTISIG,
      type: 'chain',
      chainId: chain!.chainId,
      blockNumber: timepoint.height,
    };

    const pureAccount: Omit<NoID<FlexibleProxiedAccount>, 'walletId'> = {
      name: name.trim(),
      accountId: toAccountId(proxyAddress!),
      accountType: AccountType.FLEX_PROXIED,
      type: 'chain',
      signingType: SigningType.WATCH_ONLY,
      cryptoType: isEthereumChain ? CryptoType.ETHEREUM : CryptoType.SR25519,
      deposit: '100',
      proxyAccountId: multisigAccountId!,
      delay: 0,
      chainId: chain!.chainId,
      blockNumber: timepoint.height,
      extrinsicIndex: timepoint.index,
    };

    const wallet: Omit<NoID<FlexibleMultisigWallet>, 'accounts'> = {
      name,
      type: WalletType.FLEXIBLE_MULTISIG,
    };

    return {
      wallet,
      accounts: [pureAccount, multisigAccount],
    };
  },
  target: createFlexibleMultisigWalletFx,
});

sample({
  clock: createFlexibleMultisigWalletFx.doneData.filter({ fn: nonNullable }),
  fn: ({ wallet }) => wallet.id,
  target: walletSelect.select,
});

sample({
  clock: flexibleMultisigCreated,
  source: {
    name: formModel.form.fields.name.$value,
    chain: formModel.$chain,
    multisigAccountId: formModel.$multisigAccountId,
    proxyAddress: $proxyAddress,
  },
  filter: ({ chain, multisigAccountId, proxyAddress }) => {
    return nonNullable(chain) && nonNullable(multisigAccountId) && nonNullable(proxyAddress);
  },
  fn: ({ chain, name, multisigAccountId, proxyAddress }) => {
    const isEthereumChain = networkUtils.isEthereumBased(chain!.options);

    const proxiedAccount: Omit<NoID<ProxiedAccount>, 'walletId'> = {
      name: name.trim(),
      accountId: toAccountId(proxyAddress!),
      accountType: AccountType.PROXIED,
      type: 'chain',
      signingType: SigningType.WATCH_ONLY,
      cryptoType: isEthereumChain ? CryptoType.ETHEREUM : CryptoType.SR25519,
      chainId: chain!.chainId,
      connections: [
        {
          proxyAccountId: multisigAccountId!,
          delay: 0,
          proxyType: 'Any',
        },
      ],
      proxyVariant: ProxyVariant.PURE,
      deposit: '100',
      blockNumber: undefined, // Block number not available for consequence account creation
      extrinsicIndex: undefined,
    };

    const wallet: Omit<NoID<ProxiedWallet>, 'accounts'> = {
      name: `Any for pure ${toShortAddress(toAddress(proxyAddress!), 5)}`,
      type: WalletType.PROXIED,
    };

    return {
      wallet,
      accounts: [proxiedAccount],
    };
  },
  target: createProxiedWalletFx,
});

sample({
  clock: flexibleMultisigCreated,
  source: {
    name: formModel.form.fields.name.$value,
    threshold: formModel.form.fields.threshold.$value,
    signatories: signatoryModel.$signatories,
    chain: formModel.$chain,
    multisigAccountId: formModel.$multisigAccountId,
  },
  filter: ({ chain, multisigAccountId }) => {
    return nonNullable(chain) && nonNullable(multisigAccountId);
  },
  fn: ({ signatories, chain, name, threshold, multisigAccountId }) => {
    const sortedSignatories = sortBy(
      signatories.map(a => ({ address: a.address, accountId: toAccountId(a.address), walletId: a.walletId })),
      'accountId',
    );

    const isEthereumChain = networkUtils.isEthereumBased(chain!.options);

    const multisigAccount: Omit<NoID<MultisigAccount>, 'walletId'> = {
      signatories: sortedSignatories,
      name: `${name.trim()} Multisig`,
      accountId: multisigAccountId!,
      threshold: threshold,
      cryptoType: isEthereumChain ? CryptoType.ETHEREUM : CryptoType.SR25519,
      signingType: SigningType.MULTISIG,
      accountType: AccountType.MULTISIG,
      type: 'universal',
      blockNumber: undefined, // Block number not available for consequence account creation
      remarkChainId: chain?.chainId, // Chain ID not available for consequence account creation
    };

    const wallet: Omit<NoID<MultisigWallet>, 'accounts'> = {
      name: toShortAddress(toAddress(multisigAccountId!), 5),
      type: WalletType.MULTISIG,
    };

    return {
      wallet,
      accounts: [multisigAccount],
    };
  },
  target: createMultisigWalletFx,
});

export const assignModel = {
  $flexibleMultisigCreated,
  $proxyAddress,

  startSigningFlexible,
  $pendingProxyCreate: subscribePureEventFx.pending,
};
