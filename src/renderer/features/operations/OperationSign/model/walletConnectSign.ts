import { type SignerPayloadJSON } from '@polkadot/types/types';
import { type SessionTypes } from '@walletconnect/types';
import { attach, createEffect, createStore, sample } from 'effector';
import { createGate } from 'effector-react';
import { t } from 'i18next';
import { nanoid } from 'nanoid';
import { combineEvents, spread } from 'patronum';

import { type HexString, type WcAccount } from '@/shared/core';
import { series } from '@/shared/effector';
import { assert, createTxMetadata, nonNullable, upgradeNonce } from '@/shared/lib/utils';
import { type AnyAccount, type AnyAccountDraft, accounts } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { transactionService } from '@/entities/transaction';
import { DEFAULT_POLKADOT_METHODS, walletConnect, walletConnectService } from '@/features/wallet-connect-wallet';
import { type ExtrinsicSigningPayload } from '../lib/types';

type Step = 'idle' | 'signing' | 'rejected' | 'failed' | 'success';

type SignResponse = {
  signature: HexString;
};

const flow = createGate<{ payloads: ExtrinsicSigningPayload[]; accounts: AnyAccount[] }>({
  defaultState: { payloads: [], accounts: [] },
});
const $step = createStore<Step>('idle');
const $error = createStore<{ title: string; description?: string } | null>(null);

const $signingPayloads = flow.state.map(({ payloads }) => payloads);
const $accounts = flow.state.map(({ accounts }) => accounts);

const $transactions = createStore<ReturnType<typeof transactionService.createPayloadWithMetadata>[]>([]);

/**
 * Uniq id for current request. If user cancel signing and try to sign again -
 * previous signing request will be skipped.
 */
const $pending = createStore<string | null>(null);
/**
 * Array of signatures. Used in react part for correct flow finish.
 */
const $signed = createStore<SignResponse[]>([]).reset(flow.close);

const gotFirstPayload = $signingPayloads.updates.map((payloads) => payloads.at(0)).filter({ fn: nonNullable });

const setupTransactionFx = createEffect(async (payloads: ExtrinsicSigningPayload[]) => {
  const payload = payloads.at(0);
  assert(payload, "Can't prepare empty payload");

  const account = payload.signatory;

  let metadata = await createTxMetadata(account.accountId, payload.api);

  const result: ReturnType<typeof transactionService.createPayloadWithMetadata>[] = [];

  for (const { api, extrinsic } of payloads) {
    const payload = transactionService.createPayloadWithMetadata(extrinsic, api, metadata);
    result.push(payload);
    metadata = upgradeNonce(metadata, 1);
  }

  transactionService.logPayload(result);

  return result;
});

const getSessionFx = attach({ effect: walletConnect.restoreSession });

type SignParams = {
  id: string;
  session: SessionTypes.Struct;
  payload: SignerPayloadJSON;
};

const signFx = attach({
  source: walletConnect.$client,
  async effect(client, { payload, session, id }: SignParams) {
    assert(client, 'Wallet Connect client not found.');

    const response = await walletConnect.request({
      client,
      session,
      chainId: walletConnectService.getWalletConnectChainId(payload.genesisHash),
      request: {
        method: DEFAULT_POLKADOT_METHODS.POLKADOT_SIGN_TRANSACTION,
        params: {
          address: payload.address,
          transactionPayload: payload,
        },
      },
    });

    return {
      ...(response as SignResponse),
      id,
    };
  },
});

const signAllFx = series(signFx);

const signErrorMessages = {
  rejected: {
    title: t('operation.walletConnect.errors.rejected'),
    description: t('operation.walletConnect.errors.userRejected'),
  },
  unknown: {
    title: t('operation.walletConnect.errors.connectionFailed'),
    description: t('operation.walletConnect.errors.connectionFailedDescription'),
  },
};

// Storing transaction data

sample({
  clock: setupTransactionFx.doneData,
  target: $transactions,
});

sample({
  clock: flow.close,
  target: $transactions.reinit,
});

// Steps

sample({
  clock: flow.open,
  fn: () => 'signing' as const,
  target: $step,
});

sample({
  clock: getSessionFx.fail,
  fn: ({ error }) => ({
    step: 'rejected' as const,
    error: walletConnectService.buildErrorDisplay(error, signErrorMessages),
  }),
  target: spread({
    step: $step,
    error: $error,
  }),
});

// Signing

sample({
  clock: signFx.fail,
  source: $pending,
  filter: (id, { params }) => params.id === id,
  fn: (_, { error }) => ({
    step: 'failed' as const,
    error: walletConnectService.buildErrorDisplay(error, signErrorMessages),
  }),
  target: spread({
    step: $step,
    error: $error,
  }),
});

sample({
  clock: signAllFx.doneData,
  source: $pending,
  filter: (id, response) => response.every((r) => r.id === id),
  fn: () => 'success' as const,
  target: $step,
});

sample({
  clock: flow.close,
  target: [$step.reinit, $error.reinit],
});

// Main signing flow

sample({
  clock: gotFirstPayload,
  source: networkModel.$chains,
  fn: (chains, { signatory }) => {
    return {
      pairingTopic: walletConnectService.isWalletConnectAccount(signatory)
        ? signatory.signingExtras.pairingTopic
        : undefined,
      chains: Object.values(chains).map((c) => c.chainId),
    };
  },
  target: getSessionFx,
});

sample({
  clock: $signingPayloads,
  filter: (payloads) => payloads.length > 0,
  target: setupTransactionFx,
});

const readyToSign = combineEvents({
  events: {
    session: getSessionFx.doneData,
    transactions: setupTransactionFx.doneData,
  },
  reset: flow.close,
});

sample({
  clock: readyToSign,
  source: walletConnect.$client,
  filter: nonNullable,
  fn(client, { transactions, session }) {
    assert(client, 'WC client not found');

    const id = nanoid();

    return {
      id,
      transactions: transactions.map<SignParams>(({ unsigned }) => ({
        id,
        client,
        session,
        payload: unsigned,
      })),
    };
  },
  target: spread({
    id: $pending,
    transactions: signAllFx,
  }),
});

sample({
  clock: signAllFx.doneData,
  source: $pending,
  filter: (id, response) => response.every((r) => r.id === id),
  fn: (_, response) => response,
  target: $signed,
});

// Pending management

sample({
  clock: signAllFx.doneData,
  source: $pending,
  filter: (id, response) => response.every((r) => r.id === id),
  fn: () => null,
  target: $pending,
});

sample({
  clock: $step,
  filter: (step) => step === 'idle',
  fn: () => null,
  target: $pending,
});

// updating accounts

sample({
  clock: getSessionFx.done,
  source: {
    accounts: $accounts,
    chains: networkModel.$chains,
  },
  fn: ({ accounts, chains }, { result: session }) => {
    const wcAccounts = accounts.filter(walletConnectService.isWalletConnectAccount);
    const accountsFromSession = walletConnectService.getAccountsFromSession(session, Object.values(chains));
    const accountsToCreate = new Set<AnyAccountDraft<WcAccount>>();
    const accountsToUpdate = new Set<WcAccount>();
    const accountsToDelete = new Set(wcAccounts);

    const name = wcAccounts.map((a) => a.name).at(0) ?? 'unknown';
    const walletId = wcAccounts.map((a) => a.walletId).at(0);

    assert(walletId, "Can't get walletId from accounts");

    for (const { accountId, chain } of accountsFromSession) {
      const account = wcAccounts.find((a) => a.accountId === accountId && a.chainId === chain.chainId);

      if (account) {
        if (!walletConnectService.hasSameTopic(account, session)) {
          accountsToUpdate.add(walletConnectService.updateAccount(account, session));
        }
      } else {
        accountsToCreate.add(
          walletConnectService.createAccount({
            walletId,
            name,
            accountId,
            chainId: chain.chainId,
            session,
          }),
        );
      }

      for (const accountToDelete of accountsToDelete) {
        if (accountToDelete.chainId === chain.chainId) {
          accountsToDelete.delete(accountToDelete);
          break;
        }
      }
    }

    return {
      create: Array.from(accountsToCreate),
      update: Array.from(accountsToUpdate),
      delete: Array.from(accountsToDelete),
    };
  },
  target: spread({
    create: accounts.createAccounts,
    update: accounts.updateAccounts,
    delete: accounts.deleteAccounts,
  }),
});

export const walletConnectSign = {
  $pairingUri: walletConnect.$pairingUri,
  $transactions,
  $step,
  $signed,
  $error,
  flow,
};
