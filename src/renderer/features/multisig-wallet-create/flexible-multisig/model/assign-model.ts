import { type ApiPromise } from '@polkadot/api';
import { type Codec } from '@polkadot/types/types';
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
  type Timepoint,
  WalletType,
} from '@/shared/core';
import { type FlexibleMultisigAccount, type MultisigAccount } from '@/shared/core/types/account';
import { Step, assert, nonNullable, nullable, toAccountId, toAddress, toShortAddress } from '@/shared/lib/utils';
import { polkadotjsHelpers } from '@/shared/polkadotjs-helpers';
import { type AccountId, pjsSchema } from '@/shared/polkadotjs-schemas';
import { createComplexTxStore } from '@/shared/transactions';
import { type AnyAccount, accounts } from '@/domains/network';
import { networkUtils } from '@/entities/network';
import { type ExtrinsicResultParams } from '@/entities/transaction';
import { transactionBuilder } from '@/entities/transaction';
import { walletModel } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { signModel } from '@/features/operations/OperationSign';
import { type ExtrinsicResult, submitModel, submitUtils } from '@/features/operations/OperationSubmit';
import { proxiedWalletService } from '@/features/proxied-wallet';

import { flexibleMultisigFeature } from './feature';
import { flexibleMultisigModel } from './flexible-multisig-create';
import { formModel } from './form-model';
import { signatoryModel } from './signatory-model';

const $api = combine(flexibleMultisigFeature.state, (state): ApiPromise | null => {
  if (state.status !== 'running') return null;
  return state.data.api;
});

type PureCreated = {
  accountId: AccountId;
  blockNumber: number;
  extrinsicIndex: number;
  pendingBlockNumber: number;
};

const $pureCreated = createStore<PureCreated | null>(null).reset(flexibleMultisigModel.flow.close);

type SubscribePureEvent = {
  api: ApiPromise;
  timepoint: Timepoint;
  signatory: AnyAccount;
  spawner: AccountId;
};

type PureCreatedEvent = {
  pure: AccountId;
  proxyType: Codec;
  disambiguationIndex: number;
  extrinsicIndex: number;
};

const subscribePureEventFx = createEffect(async ({ api, signatory, timepoint, spawner }: SubscribePureEvent) => {
  const pureCreated = await new Promise<PureCreatedEvent>(resolve => {
    const eventSchema = z.object({
      proxyType: z.string(),
      who: z.string(),
      pure: z.string(),
    });

    const unsubscribe = polkadotjsHelpers.subscribeSystemEvents(
      { api, section: `proxy`, methods: ['PureCreated'] },
      event => {
        const data = eventSchema.parse(event.data.toHuman());
        const accountId = toAccountId(data.who);

        if (!data || signatory.accountId !== accountId) return;

        unsubscribe.then(fn => fn());

        resolve({
          pure: pjsSchema.helpers.toAccountId(event.data[0].toHex()),
          proxyType: event.data[2],
          disambiguationIndex: parseInt(event.data[3].toHuman() as string),
          extrinsicIndex: timepoint.index,
        });
      },
    );
  });

  const apiAtBlockHash = await api.rpc.chain.getBlockHash(timepoint.height);

  const apiAt = await api.at(apiAtBlockHash);

  const blockNumber = await proxiedWalletService.findPureBlockNumber({
    api: apiAt,
    blockNumber: timepoint.height,
    pure: pureCreated.pure,
    spawner,
    type: pureCreated.proxyType,
    disambiguationIndex: pureCreated.disambiguationIndex,
    extrinsicIndex: timepoint.index,
  });

  return {
    accountId: pureCreated.pure,
    blockNumber,
    pendingBlockNumber: timepoint.height,
    extrinsicIndex: pureCreated.extrinsicIndex,
  };
});

sample({
  clock: submitModel.done,
  source: {
    api: $api,
    initiator: flexibleMultisigModel.$initiator,
    signatory: flexibleMultisigModel.$signatory,
    proxiedAddress: $pureCreated,
  },
  filter: ({ api, signatory, proxiedAddress, initiator }, results) => {
    return (
      nonNullable(api) &&
      nullable(proxiedAddress) &&
      nonNullable(signatory) &&
      nonNullable(initiator) &&
      results.some(({ result }) => submitUtils.isSuccessResult(result))
    );
  },
  fn: ({ api, signatory, initiator }, results) => {
    const successResult = results.find(({ result }) => submitUtils.isSuccessResult(result));
    assert(successResult, 'Successful result for flexible multisig creation was not found');

    const params = successResult.params as ExtrinsicResultParams;
    const timepoint = params.timepoint;

    return {
      api: api!,
      spawner: initiator!.accountId,
      signatory: signatory!,
      timepoint,
    };
  },
  target: subscribePureEventFx,
});

sample({
  clock: subscribePureEventFx.doneData,
  target: $pureCreated,
});

// Second transaction
const $coreTx = combine(
  {
    signatory: flexibleMultisigModel.$signatory,
    pureTopUpAmount: flexibleMultisigModel.$pureTopUpAmount,
    isMultisigExists: formModel.$multisigAlreadyExists,
    threshold: formModel.form.fields.threshold.$value,
    chain: formModel.$chain,
    multisigAccountId: formModel.$multisigAccountId,
    signatories: signatoryModel.$signatories,
    pureCreated: $pureCreated,
  },
  ({ signatories, chain, threshold, signatory, multisigAccountId, pureCreated, pureTopUpAmount, isMultisigExists }) => {
    if (nullable(multisigAccountId) || nullable(signatory) || nullable(chain) || nullable(pureCreated)) {
      return null;
    }
    const signatoriesWrapped = signatories
      .filter(a => a.address !== '')
      .map(s => ({ accountId: toAccountId(s.address), address: s.address }));

    return transactionBuilder.buildCreateFlexibleMultisig({
      chain,
      signatoryAccountId: signatory.accountId,
      signatories: signatoriesWrapped,
      multisigAccountId: toAccountId(multisigAccountId),
      threshold,
      proxyAccountId: pureCreated.accountId,
      pureTopUpAmount,
      isMultisigExists,
    });
  },
);

const { $tx } = createComplexTxStore({
  api: $api,
  initiator: flexibleMultisigModel.$initiator,
  signatory: flexibleMultisigModel.$signatory,
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
    signatory: flexibleMultisigModel.$signatory,
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

const successResultSaved = createEvent<{ result: ExtrinsicResult; params: ExtrinsicResultParams }>();
const $successResult = createStore<{ result: ExtrinsicResult; params: ExtrinsicResultParams } | null>(null)
  .reset(flexibleMultisigModel.flow.close)
  .on(successResultSaved, (_, payload) => payload);

sample({
  clock: submitModel.done,
  source: {
    tx: $tx,
    accounts: accounts.$list,
  },
  filter: ({ tx }, results) => nonNullable(tx) && results.some(({ result }) => submitUtils.isSuccessResult(result)),
  fn: (_, results) => {
    const successResult = results.find(({ result }) => submitUtils.isSuccessResult(result));
    assert(successResult, 'Successful result for flexible multisig creation was not found');

    return { result: successResult.result, params: successResult.params as ExtrinsicResultParams };
  },
  target: successResultSaved,
});

sample({
  clock: successResultSaved,
  target: flexibleMultisigCreated,
});

// Create wallet

const createFlexibleMultisigWalletFx = attach({ effect: walletModel.createWallet });
const createProxiedWalletFx = attach({ effect: walletModel.createWallet });
const createMultisigWalletFx = attach({ effect: walletModel.createWallet });

sample({
  clock: submitModel.done,
  source: {
    name: formModel.form.fields.name.$value,
    threshold: formModel.form.fields.threshold.$value,
    signatories: signatoryModel.$signatories,
    chain: formModel.$chain,
    flexibleMultisigCreated: $flexibleMultisigCreated,
    multisigAccountId: formModel.$multisigAccountId,
    proxyDeposit: flexibleMultisigModel.$proxyDeposit,
    pureCreated: $pureCreated,
    successResult: $successResult,
  },
  filter: ({ flexibleMultisigCreated, chain, multisigAccountId, pureCreated, successResult }) => {
    return (
      flexibleMultisigCreated &&
      nonNullable(chain) &&
      nonNullable(multisigAccountId) &&
      nonNullable(pureCreated) &&
      nonNullable(successResult)
    );
  },
  fn: ({ signatories, chain, name, threshold, multisigAccountId, pureCreated, proxyDeposit, successResult }) => {
    const timepoint = successResult!.params.timepoint;
    const sortedSignatories = sortBy(
      signatories.map(a => ({ address: a.address, accountId: toAccountId(a.address), walletId: a.walletId })),
      'accountId',
    );

    const isEthereumChain = networkUtils.isEthereumBased(chain!.options);

    const flexibleMultisigAccount: Omit<NoID<FlexibleMultisigAccount>, 'walletId'> = {
      type: 'chain',
      chainId: chain!.chainId,
      accountId: pureCreated!.accountId,
      name: name.trim(),

      multisigAccountId: multisigAccountId!,
      signatories: sortedSignatories,
      threshold: threshold,

      deposit: proxyDeposit.toString(),
      blockNumber: timepoint.height,
      extrinsicIndex: timepoint.index,

      cryptoType: isEthereumChain ? CryptoType.ETHEREUM : CryptoType.SR25519,
      signingType: SigningType.MULTISIG,
      accountType: AccountType.FLEX_MULTISIG,
    };

    const wallet: Omit<NoID<FlexibleMultisigWallet>, 'accounts'> = {
      name,
      type: WalletType.FLEXIBLE_MULTISIG,
    };

    return {
      wallet,
      accounts: [flexibleMultisigAccount],
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
    pureCreated: $pureCreated,
    proxyDeposit: flexibleMultisigModel.$proxyDeposit,
    successResult: $successResult,
  },
  filter: ({ chain, multisigAccountId, pureCreated, successResult }) => {
    return (
      nonNullable(chain) && nonNullable(multisigAccountId) && nonNullable(pureCreated) && nonNullable(successResult)
    );
  },
  fn: ({ chain, name, multisigAccountId, pureCreated, proxyDeposit, successResult }) => {
    const timepoint = successResult!.params.timepoint;
    const isEthereumChain = networkUtils.isEthereumBased(chain!.options);

    const proxiedAccount: Omit<NoID<ProxiedAccount>, 'walletId'> = {
      name: name.trim(),
      accountId: pureCreated!.accountId,
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
      deposit: proxyDeposit.toString(),
      blockNumber: pureCreated!.blockNumber,
      pendingBlockNumber: timepoint.height,
      extrinsicIndex: timepoint.index,
    };

    const wallet: Omit<NoID<ProxiedWallet>, 'accounts'> = {
      name: `Any for pure ${toShortAddress(pureCreated!.accountId, 5)}`,
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
    multisigAlreadyExists: formModel.$multisigAlreadyExists,
    successResult: $successResult,
  },
  filter: ({ chain, multisigAccountId, successResult, multisigAlreadyExists }) => {
    return nonNullable(chain) && nonNullable(multisigAccountId) && nonNullable(successResult) && !multisigAlreadyExists;
  },
  fn: ({ signatories, chain, name, threshold, multisigAccountId, successResult }) => {
    const timepoint = successResult!.params.timepoint;
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
      blockNumber: timepoint.height,
      remarkChainId: chain?.chainId,
    };

    const wallet: Omit<NoID<MultisigWallet>, 'accounts'> = {
      name: toShortAddress(toAddress(multisigAccountId!, { prefix: chain?.addressPrefix }), 5),
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
  $pureCreated,

  startSigningFlexible,
  $pendingProxyCreate: subscribePureEventFx.pending,
};
