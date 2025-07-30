import { type ApiPromise } from '@polkadot/api';
import { attach, combine, createEffect, createEvent, createStore, sample } from 'effector';
import { sortBy } from 'lodash';
import { spread } from 'patronum';
import { z } from 'zod';

import { AccountType, type Address, CryptoType, type NoID, ProxyVariant, SigningType, WalletType } from '@/shared/core';
import { type FlexibleMultisigAccount, type FlexibleProxiedAccount } from '@/shared/core/types/account';
import { Step, nonNullable, nullable, toAccountId } from '@/shared/lib/utils';
import { polkadotjsHelpers } from '@/shared/polkadotjs-helpers';
import { createComplexTxStore } from '@/shared/transactions';
import { type AnyAccount, accounts } from '@/domains/network';
import { networkUtils } from '@/entities/network';
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

const $proxyAddress = createStore<Address | null>(null).reset(flexibleMultisigModel.flow.close);

type SubscribePureEvent = {
  api: ApiPromise;
  accounts: AnyAccount[];
};

const subscribePureEventFx = createEffect(({ api, accounts }: SubscribePureEvent): Promise<Address> => {
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

        if (!data || !accounts.some(a => a.accountId === accountId)) return;

        unsubscribe.then(fn => fn());
        resolve(data.pure);
      },
    );
  });
});

sample({
  clock: submitModel.output.formSubmitted,
  source: {
    api: $api,
    accounts: accounts.$list,
    proxyAddress: $proxyAddress,
  },
  filter: ({ api, proxyAddress }, results) => {
    return (
      nonNullable(api) && nullable(proxyAddress) && results.some(({ result }) => submitUtils.isSuccessResult(result))
    );
  },
  fn: ({ api, accounts }) => {
    return {
      api: api!,
      accounts,
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
    threshold: formModel.form.fields.threshold.$value,
    chain: formModel.$chain,
    multisigAccountId: formModel.$multisigAccountId,
    signatories: signatoryModel.$signatories,
    proxyAddress: $proxyAddress,
  },
  ({ signatories, chain, totalDeposit, threshold, signatory, multisigAccountId, proxyAddress }) => {
    if (nullable(multisigAccountId) || nullable(signatory) || nullable(chain) || nullable(proxyAddress)) {
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
    signer: flexibleMultisigModel.$signer,
    initiator: flexibleMultisigModel.$initiator,
  },
  filter: ({ chain, tx, signer, initiator }) =>
    nonNullable(chain) && nonNullable(tx) && nonNullable(signer) && nonNullable(initiator),
  fn: ({ chain, tx, signer, initiator }) => ({
    event: {
      signingPayloads: [
        {
          chain: chain!,
          account: initiator!,
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
    initiator: flexibleMultisigModel.$initiator,
    signatory: flexibleMultisigModel.$signer,
  },
  filter: ({ chain, coreTx, tx, signatory }) => {
    return nonNullable(chain) && nonNullable(tx) && nonNullable(coreTx) && nonNullable(signatory);
  },
  fn: ({ coreTx, tx, chain, signatory, initiator }, signParams) => {
    return {
      event: {
        ...signParams,
        chain: chain!,
        account: initiator!,
        signatory: signatory!,
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

const $flexibleMultisigCreated = createStore<boolean>(false).reset(flexibleMultisigModel.flow.close);

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
    proxyAddress: $proxyAddress,
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
  target: walletSelect.select,
});

export const assignModel = {
  $flexibleMultisigCreated,
  $proxyAddress,

  startSigningFlexible,
  $pendingProxyCreate: subscribePureEventFx.pending,
};
