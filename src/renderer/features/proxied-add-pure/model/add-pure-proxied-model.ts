import { type ApiPromise } from '@polkadot/api';
import { type UnsubscribePromise } from '@polkadot/api/types';
import { type Codec } from '@polkadot/types/types';
import { combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { delay, spread } from 'patronum';

import { type PartialProxiedAccount, ProxyVariant, type Timepoint } from '@/shared/core';
import { nonNullable, nullable, toAddress } from '@/shared/lib/utils';
import { systemPallet } from '@/shared/pallet/system';
import { type AccountId, pjsSchema } from '@/shared/polkadotjs-schemas';
import { type PathType, Paths } from '@/shared/routes';
import { subscriptionService } from '@/entities/chain';
import { networkModel } from '@/entities/network';
import { proxyModel } from '@/entities/proxy';
import { type ExtrinsicResultParams } from '@/entities/transaction';
import { walletModel, walletUtils } from '@/entities/wallet';
import { type BasketTransactionDraft, basketOperations } from '@/aggregates/basket-operations';
import { balanceSubModel } from '@/features/assets-balances';
import { navigationModel } from '@/features/navigation';
import { type SigningPayload } from '@/features/operations/OperationSign';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { submitModel, submitUtils } from '@/features/operations/OperationSubmit';
import {
  type AddPureProxiedConfirm,
  addPureProxiedConfirmModel as confirmModel,
} from '@/features/operations/OperationsConfirm/AddPureProxied';
import { proxiedWalletService } from '@/features/proxied-wallet';
import { proxiesModel } from '@/features/proxies';
import { addPureProxiedUtils } from '../lib/add-pure-proxied-utils';
import { Step } from '../lib/types';

import { formModel } from './form-model';

const stepChanged = createEvent<Step>();

const flowFinished = createEvent();
const txSaved = createEvent();

const $step = restore(stepChanged, Step.NONE);

const $redirectAfterSubmitPath = createStore<PathType | null>(null).reset(formModel.flowStarted);

const $initiatorWallet = combine(
  {
    initiator: formModel.form.fields.initiator.$value,
    wallets: walletModel.$wallets,
  },
  ({ initiator, wallets }) => {
    if (!initiator) return null;

    return walletUtils.getWalletById(wallets, initiator.walletId);
  },
);

type GetPureProxyParams = {
  api: ApiPromise;
  spawner: AccountId;
  timepoint: Timepoint;
};

type PureCreatedEvent = {
  pure: AccountId;
  proxyType: Codec;
  extrinsicIndex: number;
  disambiguationIndex: number;
};

type GetPureProxyResult = {
  pure: AccountId;
  blockNumber: number;
  pendingBlockNumber: number;
  extrinsicIndex: number;
};

const getPureProxyFx = createEffect(
  async ({ api, spawner, timepoint }: GetPureProxyParams): Promise<GetPureProxyResult> => {
    const pureCreated = await new Promise<PureCreatedEvent>(resolve => {
      const pureCreatedParams = {
        section: 'proxy',
        method: 'PureCreated',
        data: [undefined, toAddress(spawner, { prefix: systemPallet.consts.ss58Prefix(api) })],
      };

      const unsubscribe: UnsubscribePromise = subscriptionService.subscribeEvents(api, pureCreatedParams, event => {
        unsubscribe?.then(fn => fn());

        resolve({
          pure: pjsSchema.helpers.toAccountId(event.data[0].toHex()),
          proxyType: event.data[2],
          disambiguationIndex: parseInt(event.data[3].toHuman() as string),
          extrinsicIndex: timepoint.index,
        });
      });
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
      pure: pureCreated.pure,
      blockNumber,
      pendingBlockNumber: timepoint.height,
      extrinsicIndex: pureCreated.extrinsicIndex,
    };
  },
);

sample({
  clock: formModel.flowStarted,
  fn: () => Step.INIT,
  target: stepChanged,
});

sample({
  clock: formModel.flowStarted,
  source: formModel.$wallet,
  filter: wallet => nonNullable(wallet),
  target: balanceSubModel.fetchWallet,
});

sample({
  clock: formModel.flowStarted,
  target: formModel.formInitiated,
});

const formSubmitted = sample({
  clock: formModel.formSubmitted,
  source: {
    coreTx: formModel.$coreTx,
    multisigDeposit: formModel.$multisigDeposit,
    route: formModel.$route,
    fee: formModel.$fee,
    tx: formModel.$tx,
    chain: formModel.form.fields.chain.$value,
  },
  fn: (source, formSubmitted) => {
    return {
      ...source,
      ...formSubmitted,
    };
  },
}).filterMap(({ coreTx, multisigDeposit, route, tx, chain, formData }) => {
  if (
    nonNullable(tx) &&
    nonNullable(coreTx) &&
    nonNullable(chain) &&
    nonNullable(formData.signatory) &&
    nonNullable(formData.initiator)
  ) {
    return [
      {
        ...formData,
        initiator: formData.initiator,
        signatory: formData.signatory,
        multisigDeposit: multisigDeposit.toString(),
        fee: formData.fee,
        proxyDeposit: formData.proxyDeposit,
        chain,
        coreTx,
        route,
        tx,
      } satisfies AddPureProxiedConfirm,
    ];
  }
});

sample({
  clock: formSubmitted,
  fn: event => {
    return {
      event,
      step: Step.CONFIRM,
    };
  },
  target: spread({
    event: confirmModel.init,
    step: stepChanged,
  }),
});

sample({
  clock: confirmModel.startSigning,
  source: {
    tx: formModel.$tx,
    chain: formModel.form.fields.chain.$value,
    initiator: formModel.form.fields.initiator.$value,
    signatory: formModel.form.fields.signatory.$value,
  },
  filter: ({ tx, chain, initiator, signatory }) =>
    nonNullable(tx) && nonNullable(chain) && nonNullable(initiator) && nonNullable(signatory) && nonNullable(chain),
  fn: ({ tx, chain, initiator, signatory }) => ({
    event: {
      signingPayloads: [
        {
          chain: chain!,
          account: initiator!,
          signatory,
          transaction: tx!,
        },
      ] satisfies SigningPayload[],
    },
    step: Step.SIGN,
  }),
  target: spread({
    event: signModel.events.formInitiated,
    step: stepChanged,
  }),
});

sample({
  clock: signModel.signed,
  source: $step,
  filter: step => step !== Step.NONE,
  fn: (_, signParams) => {
    return {
      event: signParams,
      step: Step.SUBMIT,
    };
  },
  target: spread({
    event: submitModel.init,
    step: stepChanged,
  }),
});

sample({
  clock: submitModel.done,
  source: {
    step: $step,
    apis: networkModel.$apis,
    initiator: formModel.form.fields.initiator.$value,
    chain: formModel.form.fields.chain.$value,
  },
  filter: ({ step, initiator, chain }) =>
    addPureProxiedUtils.isSubmitStep(step) &&
    nonNullable(initiator) &&
    nonNullable(chain) &&
    nonNullable(chain.chainId),
  fn: ({ apis, initiator, chain }, submitData) => ({
    api: apis[chain!.chainId],
    spawner: initiator!.accountId,
    timepoint: (submitData[0].params as ExtrinsicResultParams).timepoint,
  }),
  target: getPureProxyFx,
});

sample({
  clock: getPureProxyFx.doneData,
  source: {
    initiator: formModel.form.fields.initiator.$value,
    chain: formModel.form.fields.chain.$value,
  },
  filter: ({ initiator, chain }) => nonNullable(initiator) && nonNullable(chain),
  fn: ({ initiator, chain }, { pure: accountId }) => [
    {
      accountId: initiator!.accountId,
      proxiedAccountId: accountId,
      chainId: chain!.chainId,
      proxyType: 'Any' as const,
      delay: 0,
    },
  ],
  target: proxyModel.events.proxiesAdded,
});

sample({
  clock: getPureProxyFx.doneData,
  source: {
    initiator: formModel.form.fields.initiator.$value,
    chain: formModel.form.fields.chain.$value,
    proxyDeposit: formModel.$proxyDeposit,
  },
  filter: ({ initiator, chain }) => nonNullable(initiator) && nonNullable(chain),
  fn: ({ chain, initiator, proxyDeposit }, { pure: accountId, blockNumber, extrinsicIndex, pendingBlockNumber }) => {
    return [
      {
        accountId,
        chainId: chain!.chainId,
        connections: [
          {
            proxyAccountId: initiator!.accountId,
            delay: 0,
            proxyType: 'Any',
          },
        ],
        proxyVariant: ProxyVariant.PURE,
        blockNumber,
        pendingBlockNumber,
        extrinsicIndex,
        deposit: proxyDeposit,
      },
    ] satisfies PartialProxiedAccount[];
  },
  target: proxiesModel.createProxiedWalletsFx,
});

sample({
  clock: submitModel.done,
  source: formModel.$isMultisig,
  filter: (isMultisig, results) => isMultisig && submitUtils.isSuccessResult(results[0].result),
  fn: () => Paths.OPERATIONS,
  target: $redirectAfterSubmitPath,
});

sample({
  clock: flowFinished,
  source: $redirectAfterSubmitPath,
  filter: nonNullable,
  target: navigationModel.events.navigateTo,
});

sample({
  clock: txSaved,
  source: {
    coreTx: formModel.$coreTx,
  },
  fn: ({ coreTx }) => {
    if (nullable(coreTx)) return [];

    const tx: BasketTransactionDraft = {
      initiatorAccountId: coreTx.accountId,
      coreTx,
      route: [],
      createdAt: Date.now(),
    };

    return [tx];
  },
  target: basketOperations.addTransactions,
});

sample({
  clock: txSaved,
  fn: () => Step.BASKET,
  target: stepChanged,
});

sample({
  clock: delay(getPureProxyFx.doneData, 2000),
  target: flowFinished,
});

sample({
  clock: flowFinished,
  fn: () => Step.NONE,
  target: stepChanged,
});

export const addPureProxiedModel = {
  $step,
  $initiatorWallet,

  events: {
    flowStarted: formModel.flowStarted,
    stepChanged,
    txSaved,
  },
  output: {
    flowFinished,
  },
};
