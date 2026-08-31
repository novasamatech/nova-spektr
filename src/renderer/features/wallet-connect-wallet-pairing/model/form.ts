import { type SessionTypes } from '@walletconnect/types';
import { type EffectParams, attach, combine, createEvent, createStore, sample } from 'effector';
import { createForm } from 'effector-forms';
import { t } from 'i18next';
import { noop } from 'lodash';

import { type WcAccount, AccountType, CryptoType, SigningType, WalletType } from '@/shared/core';
import { createFlow, waitFor } from '@/shared/effector';
import { isEthereumAccountId, nonNullable, nullable } from '@/shared/lib/utils';
import { accountSync, identity } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { walletConnect, walletConnectService } from '@/features/wallet-connect-wallet';
import { IDENTITY_CHAIN, Step, WALLET_NAME_MAX_LENGTH } from '../lib/constants';
import { type WalletTypeName } from '../lib/types';

/**
 * Identity of a single pairing attempt. `flow.open` builds a fresh object on
 * every click and `flow.state` holds it until the flow is shut or reopened. A
 * session request carries the object it started with, so its outcome can be
 * matched against the attempt on screen.
 */
type PairingAttempt = {
  type: 'novawallet' | 'walletconnect' | null;
  onComplete: (walletName: string, type: WalletTypeName) => void;
};

const flow = createFlow<PairingAttempt>({ type: null, onComplete: noop });

const reset = createEvent();

const $step = createStore(Step.SCAN).reset(reset);
const $error = createStore<{ title: string; description?: string } | null>(null).reset(reset);

const readyToPair = waitFor({
  source: flow.open,
  clock: walletConnect.$client,
  filter: nonNullable,
  reset: flow.shut,
});

/**
 * Pairing session
 */
const $session = createStore<SessionTypes.Struct | null>(null);

type WalletForm = {
  walletName: string;
};

const form = createForm<WalletForm>({
  fields: {
    walletName: {
      init: '',
      rules: [
        {
          name: 'required',
          errorText: t('onboarding.watchOnly.walletNameRequiredError'),
          validator: Boolean,
        },
        {
          name: 'maxLength',
          errorText: t('onboarding.watchOnly.walletNameMaxLenError'),
          validator: value => value.length <= WALLET_NAME_MAX_LENGTH,
        },
      ],
    },
  },
  validateOn: ['submit'],
});

/**
 * Accounts from successful pairing response
 */
const $accounts = combine($session, networkModel.$chains, (session, chains) => {
  if (nullable(session)) return [];

  return walletConnectService.getAccountsFromSession(session, Object.values(chains));
});

type CreateSessionParams = EffectParams<typeof walletConnect.createSession> & { attempt: PairingAttempt };

const createSessionFx = attach({
  effect: walletConnect.createSession,
  mapParams: ({ attempt: _attempt, ...params }: CreateSessionParams) => params,
});

/** The request was started by the attempt the modal shows now. */
const isLiveAttempt = (attempt: PairingAttempt, { params }: { params: CreateSessionParams }) =>
  params.attempt === attempt;

const createWalletConnectWalletFx = attach({ effect: walletModel.createWallet });
const requestIdentityFx = attach({ effect: identity.request });

sample({
  clock: $accounts,
  filter: accounts => accounts.length > 0,
  fn: accounts => ({
    chainId: IDENTITY_CHAIN,
    accounts: [accounts[0]!.accountId],
  }),
  target: requestIdentityFx,
});

sample({
  clock: form.formValidated,
  source: {
    accounts: $accounts,
    session: $session,
    flowState: flow.state,
  },
  fn({ accounts, session, flowState }, { walletName }) {
    const wcAccounts = accounts.map<Omit<WcAccount, 'id' | 'walletId'>>(({ accountId, chain }) => {
      return {
        type: 'chain',
        name: walletName.trim(),
        accountId,
        accountType: AccountType.WALLET_CONNECT,
        signingType: SigningType.WALLET_CONNECT,
        cryptoType: isEthereumAccountId(accountId) ? CryptoType.ETHEREUM : CryptoType.SR25519,
        chainId: chain.chainId,
        signingExtras: { pairingTopic: session?.pairingTopic, sessionTopic: session?.topic },
        createdAt: Date.now(),
      };
    });

    return {
      accounts: wcAccounts,
      wallet: {
        name: walletName.trim(),
        type: flowState.type === 'novawallet' ? WalletType.NOVA_WALLET : WalletType.WALLET_CONNECT,
        signingType: SigningType.WALLET_CONNECT,
      },
    };
  },
  target: createWalletConnectWalletFx,
});

sample({
  clock: createWalletConnectWalletFx.done,
  target: attach({
    source: flow.state,
    effect: (state, { params }) => {
      if (nullable(state.type)) return;

      const walletType: Record<'novawallet' | 'walletconnect', WalletTypeName> = {
        novawallet: WalletType.NOVA_WALLET,
        walletconnect: WalletType.WALLET_CONNECT,
      };
      state.onComplete(params.wallet.name, walletType[state.type]);
    },
  }),
});

sample({
  clock: createWalletConnectWalletFx.done,
  target: flow.shut,
});

sample({
  clock: createWalletConnectWalletFx.done,
  target: accountSync.syncAccounts,
});

sample({
  clock: createWalletConnectWalletFx.doneData.filter({ fn: nonNullable }),
  fn: ({ wallet }) => wallet.id,
  target: walletSelect.select,
});

sample({
  clock: readyToPair,
  source: networkModel.$chains,
  fn: (chains, { event: attempt, trigger: client }) => ({
    client,
    chains: Object.values(chains).map(c => c.chainId),
    attempt,
  }),
  target: createSessionFx,
});

sample({
  clock: createSessionFx.done,
  source: flow.state,
  filter: isLiveAttempt,
  fn: (_attempt, { result }) => result,
  target: $session,
});

// A session from an abandoned attempt never reaches the screen. Disconnect it, so the phone does not
// keep a session this app forgot. Every attempt pairs on its own topic, so the live session is safe.
sample({
  clock: createSessionFx.done,
  source: flow.state,
  filter: (attempt, done) => !isLiveAttempt(attempt, done),
  fn: (_attempt, { result }) => ({ pairingTopic: result.pairingTopic }),
  target: walletConnect.removeSession,
});

sample({
  clock: reset,
  source: $session,
  filter: (session: SessionTypes.Struct | null): session is SessionTypes.Struct => nonNullable(session),
  fn: session => ({
    pairingTopic: session.pairingTopic,
  }),
  target: walletConnect.removeSession,
});

sample({
  clock: [reset, flow.shut],
  target: [form.reset, $error.reinit],
});

sample({
  clock: flow.open,
  fn: () => Step.SCAN,
  target: $step,
});

sample({
  clock: createSessionFx.done,
  source: { step: $step, attempt: flow.state },
  filter: ({ step, attempt }, done) => step === Step.SCAN && isLiveAttempt(attempt, done),
  fn: () => Step.MANAGE,
  target: $step,
});

sample({
  clock: createSessionFx.fail,
  source: { step: $step, attempt: flow.state },
  filter: ({ step, attempt }, fail) => step === Step.SCAN && isLiveAttempt(attempt, fail),
  fn: () => Step.REJECT,
  target: $step,
});

sample({
  clock: createSessionFx.fail,
  source: flow.state,
  filter: isLiveAttempt,
  fn: (_attempt, { error }) =>
    walletConnectService.buildErrorDisplay(error, {
      rejected: { title: t('onboarding.walletConnect.rejected') },
      unknown: { title: t('onboarding.walletConnect.connectionFailed') },
    }),
  target: $error,
});

export const pairingFormModel = {
  flow,

  form,
  $uri: walletConnect.$pairingUri,
  $session,
  $accounts,
  $step,
  $error,
  $identityPending: requestIdentityFx.pending,
  reset,
};
