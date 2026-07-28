import { combine, createEffect, createEvent, createStore, merge, sample } from 'effector';
import { persist as persistLocal } from 'effector-storage/local';
import { t } from 'i18next';
import { interval, once } from 'patronum';
import { toast } from 'sonner';

import { persist } from '@/shared/api/storage';
import { type ChainId } from '@/shared/core';
import { assert, nonNullable, toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { backendAuthService } from '@/domains/backend';
import { type AnyAccount } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { polkadotExtensionService } from '@/features/extension-wallet';
import { messageSignModel } from '@/features/operations/OperationMessageSign';
import { DEFAULT_AUTH_CHAIN_ID } from '../lib/auth-chain';
import { buildSignMessage } from '../lib/sign-message';

import { backendConfigurationModel } from './backend-configuration-model';

type AuthState = {
  accountId: AccountId;
  accountName: string;
  permissions: string[];
};

type AuthStep = 'selectAccount' | 'signing' | 'error';

type ConnectionResult = { status: 'idle' } | { status: 'success' } | { status: 'error'; message: string };

export type SignableAccount = {
  account: AnyAccount;
  accountId: AccountId;
  name: string;
  walletName: string;
};

// Events
const signInClicked = createEvent();
const signOutClicked = createEvent();
const accountSelected = createEvent<AccountId>();
const chainSelected = createEvent<ChainId>();
const signConfirmed = createEvent();
const connectTriggered = createEvent();
const modalClosed = createEvent();
const signingCancelled = createEvent();
const unauthorizedResponseReceived = createEvent();

// Stores
const $authState = createStore<AuthState | null>(null);
const $authStep = createStore<AuthStep>('selectAccount');
const $selectedAccountId = createStore<AccountId | null>(null);
const $selectedChainId = createStore<ChainId>(DEFAULT_AUTH_CHAIN_ID);
const $error = createStore<string | null>(null);
const $connectionResult = createStore<ConnectionResult>({ status: 'idle' });
const $challengeId = createStore<string | null>(null);

$selectedChainId.on(chainSelected, (_, chainId) => chainId);

// Polkadot relay until the first successful sign-in, then the last successfully used chain.
const $defaultAuthChainId = createStore<ChainId>(DEFAULT_AUTH_CHAIN_ID);
persistLocal({ store: $defaultAuthChainId, key: 'address-book-default-auth-chain-id', sync: true });

// Account of the last successful sign-in. Unlike $lastAuthedAccountId it survives sign-out
// and source disconnect, so reconnecting preselects the account the user used before.
const $defaultAuthAccountId = createStore<AccountId | null>(null);
persistLocal({ store: $defaultAuthAccountId, key: 'address-book-default-auth-account-id', sync: true });

const $lastAuthedAccountId = createStore<AccountId | null>(null);
persist({ store: $lastAuthedAccountId, key: 'address-book-last-authed-account-id' });

const $isAuthenticated = $authState.map(state => state !== null);

const $signableAccounts = walletModel.$wallets.map((wallets): SignableAccount[] => {
  const extensionAccounts: SignableAccount[] = wallets
    .filter(polkadotExtensionService.isExtensionWallet)
    .flatMap(wallet =>
      wallet.accounts.filter(polkadotExtensionService.isExtensionAccount).map(
        (account): SignableAccount => ({
          account,
          accountId: account.accountId,
          name: account.name,
          walletName: wallet.name,
        }),
      ),
    );

  const vaultAccounts: SignableAccount[] = wallets
    .filter(w => walletUtils.isPolkadotVaultGroup(w))
    .flatMap(wallet =>
      wallet.accounts.flatMap((account): SignableAccount[] => {
        const isSignable = walletUtils.isSingleShard(wallet)
          ? accountUtils.isVaultBaseAccount(account)
          : accountUtils.isVaultChainAccount(account) || accountUtils.isVaultShardAccount(account);

        if (isSignable) {
          return [
            {
              account,
              accountId: account.accountId,
              name: account.name,
              walletName: wallet.name,
            },
          ];
        }

        return [];
      }),
    );

  return [...extensionAccounts, ...vaultAccounts];
});

const $selectedAccount = combine($signableAccounts, $selectedAccountId, (accounts, selectedId) => {
  if (!selectedId) return null;

  return accounts.find(a => a.accountId === selectedId) ?? null;
});

// Effects
const requestChallengeFx = createEffect(async ({ baseUrl, accountId }: { baseUrl: string; accountId: string }) => {
  return backendAuthService.requestChallenge(baseUrl, accountId);
});

const verifySignatureFx = createEffect(
  async ({
    baseUrl,
    accountId,
    challengeId,
    signature,
  }: {
    baseUrl: string;
    accountId: string;
    challengeId: string;
    signature: string;
  }) => {
    return backendAuthService.verifySignature(baseUrl, { accountId, challengeId, signature });
  },
);

const checkSessionFx = createEffect(async (baseUrl: string) => {
  return backendAuthService.checkSession(baseUrl);
});

const logoutFx = createEffect(async (baseUrl: string) => {
  return backendAuthService.logout(baseUrl);
});

// Wiring: connectTriggered → save URL + begin auth
// Step 1: Save draft URL to $backendUrl (must be declared before auth trigger)
sample({
  clock: connectTriggered,
  source: backendConfigurationModel.$draftUrl,
  fn: url => (url ? url.trim().replace(/#.*$/, '').replace(/\/+$/, '') : null) || null,
  target: backendConfigurationModel.$backendUrl,
});

// Step 2: Begin signing
$authStep.on(connectTriggered, () => 'signing');

// Step 3: Trigger auth challenge flow (reuses signConfirmed path)
sample({
  clock: connectTriggered,
  source: $selectedAccountId,
  filter: (id): id is AccountId => id !== null,
  target: signConfirmed,
});

// Wiring: signInClicked → reset state for new sign-in
$authStep.on(signInClicked, () => 'selectAccount');
$selectedAccountId.on(signInClicked, () => null);
$error.on(signInClicked, () => null);

sample({
  clock: [signInClicked, backendConfigurationModel.events.modalOpened, backendConfigurationModel.events.editStarted],
  source: {
    accounts: $signableAccounts,
    selectedId: $selectedAccountId,
    authState: $authState,
    lastAuthedId: $lastAuthedAccountId,
    defaultAccountId: $defaultAuthAccountId,
  },
  filter: ({ accounts, selectedId }) => accounts.length > 0 && selectedId === null,
  fn: ({ accounts, authState, lastAuthedId, defaultAccountId }) => {
    const priorId = authState?.accountId ?? lastAuthedId ?? defaultAccountId;
    const prior = priorId ? accounts.find(a => a.accountId === priorId) : undefined;

    return (prior ?? accounts[0]!).accountId;
  },
  target: accountSelected,
});

// Wiring: accountSelected
$selectedAccountId.on(accountSelected, (_, id) => id);

// Wiring: signingCancelled → back to account selection
$authStep.on(signingCancelled, () => 'selectAccount');

// Reset auth UI state when modal opens, closes, or connect completes
const resetAuthUiTriggers = [
  modalClosed,
  backendConfigurationModel.events.connectCompleted,
  backendConfigurationModel.events.editStarted,
  backendConfigurationModel.events.modalOpened,
  backendConfigurationModel.events.urlCleared,
];

$authStep.on(resetAuthUiTriggers, () => 'selectAccount');
$selectedAccountId.on(resetAuthUiTriggers, () => null);
$error.on(resetAuthUiTriggers, () => null);
$challengeId.on(resetAuthUiTriggers, () => null);

sample({
  clock: resetAuthUiTriggers,
  source: { defaultChainId: $defaultAuthChainId, chains: networkModel.$chains },
  fn: ({ defaultChainId, chains }) => {
    // The saved chain may have been removed from the chains config since it was saved;
    // trust it while chains are still loading.
    const isKnownChain = nonNullable(chains[defaultChainId]) || Object.keys(chains).length === 0;

    return isKnownChain ? defaultChainId : DEFAULT_AUTH_CHAIN_ID;
  },
  target: $selectedChainId,
});

// Wiring: signConfirmed → requestChallengeFx
$authStep.on(signConfirmed, () => 'signing');

sample({
  clock: signConfirmed,
  source: { baseUrl: backendConfigurationModel.$backendUrl, accountId: $selectedAccountId },
  filter: ({ baseUrl, accountId }) => baseUrl !== null && accountId !== null,
  fn: ({ baseUrl, accountId }) => ({
    baseUrl: baseUrl!,
    accountId: accountId!,
  }),
  target: requestChallengeFx,
});

// Wiring: requestChallengeFx.done → store challengeId + init message signing
sample({
  clock: requestChallengeFx.doneData,
  fn: data => data.challengeId,
  target: $challengeId,
});

sample({
  clock: requestChallengeFx.doneData,
  source: { account: $selectedAccount, chainId: $selectedChainId },
  filter: ({ account }) => account !== null,
  fn: ({ account, chainId }, challengeData) => {
    const signatory = account!.account;
    const messageText = buildSignMessage(challengeData.nonce);
    const message = new TextEncoder().encode(messageText);

    return { message, signatory, chainId };
  },
  target: messageSignModel.init,
});

// Gate on 'signing' step so a later $selectedChainId reset doesn't leak into messageSignModel.
sample({
  clock: $selectedChainId,
  source: $authStep,
  filter: step => step === 'signing',
  fn: (_, chainId) => chainId,
  target: messageSignModel.chainIdChanged,
});

// Wiring: messageSignModel.signed → verifySignatureFx
sample({
  clock: messageSignModel.signed,
  source: {
    baseUrl: backendConfigurationModel.$backendUrl,
    accountId: $selectedAccountId,
    challengeId: $challengeId,
  },
  filter: ({ baseUrl, accountId, challengeId }) => baseUrl !== null && accountId !== null && challengeId !== null,
  fn: ({ baseUrl, accountId, challengeId }, signResult) => ({
    baseUrl: baseUrl!,
    accountId: accountId!,
    challengeId: challengeId!,
    signature: signResult.signature,
  }),
  target: verifySignatureFx,
});

// Wiring: verifySignatureFx.done → set auth state, close modal
sample({
  clock: verifySignatureFx.doneData,
  source: { accountId: $selectedAccountId, account: $selectedAccount },
  filter: ({ accountId, account }) => accountId !== null && account !== null,
  fn: ({ accountId, account }, verifyData): AuthState => ({
    accountId: accountId!,
    accountName: account!.name,
    permissions: verifyData.permissions,
  }),
  target: $authState,
});

// Both samples must stay declared before the connectCompleted sample below — they have to
// read $selectedChainId / $selectedAccountId before the connectCompleted-triggered reset
// overwrites them.
sample({
  clock: verifySignatureFx.done,
  source: $selectedChainId,
  target: $defaultAuthChainId,
});

sample({
  clock: verifySignatureFx.done,
  source: $selectedAccountId,
  filter: nonNullable,
  target: $defaultAuthAccountId,
});

const signInSucceeded = createEvent();

sample({
  clock: verifySignatureFx.done,
  target: [signInSucceeded, backendConfigurationModel.events.connectCompleted],
});

// Connection result tracking
$connectionResult
  .on(verifySignatureFx.done, (): ConnectionResult => ({ status: 'success' }))
  .on(
    [connectTriggered, signInClicked, backendConfigurationModel.events.urlCleared],
    (): ConnectionResult => ({ status: 'idle' }),
  );

sample({
  clock: [requestChallengeFx.failData, verifySignatureFx.failData],
  fn: (error: Error): ConnectionResult => ({ status: 'error', message: error.message }),
  target: $connectionResult,
});

// Wiring: effect failures → error step
sample({
  clock: [requestChallengeFx.failData, verifySignatureFx.failData],
  fn: (error: Error) => error.message,
  target: $error,
});

$authStep.on([requestChallengeFx.fail, verifySignatureFx.fail], () => 'error');

// Wiring: signOutClicked → logoutFx
sample({
  clock: signOutClicked,
  source: backendConfigurationModel.$backendUrl,
  filter: (url): url is string => url !== null,
  target: logoutFx,
});

$authState.on(logoutFx.finally, () => null);

sample({
  clock: $authState,
  filter: state => state !== null,
  fn: state => state!.accountId,
  target: $lastAuthedAccountId,
});

$lastAuthedAccountId.on([logoutFx.finally, backendConfigurationModel.events.urlCleared], () => null);

// Wiring: urlCleared → clear auth state + logout
sample({
  clock: backendConfigurationModel.events.urlCleared,
  source: backendConfigurationModel.$backendUrl,
  filter: (url): url is string => url !== null,
  target: logoutFx,
});

$authState.on(backendConfigurationModel.events.urlCleared, () => null);

const $isSessionExpired = createStore(false);

// Session recovery: when backend URL is available on start, check session
const sessionRecoveryTriggered = once({
  source: backendConfigurationModel.$backendUrl.updates,
  reset: backendConfigurationModel.events.urlCleared,
});

sample({
  clock: sessionRecoveryTriggered,
  filter: (url): url is string => url !== null,
  target: checkSessionFx,
});

sample({
  clock: backendConfigurationModel.events.editStarted,
  source: backendConfigurationModel.$backendUrl,
  filter: (url): url is string => url !== null,
  target: checkSessionFx,
});

sample({
  clock: checkSessionFx.doneData,
  source: $signableAccounts,
  filter: (_accounts, sessionData) => sessionData !== null,
  fn: (accounts, sessionData): AuthState => {
    assert(sessionData);
    const accountId = toAccountId(sessionData.accountId);
    const match = accounts.find(a => a.accountId === accountId);

    return {
      accountId,
      accountName: match?.name ?? '',
      permissions: sessionData.permissions,
    };
  },
  target: $authState,
});

sample({
  clock: checkSessionFx.doneData,
  filter: (session): session is NonNullable<typeof session> => session !== null,
  fn: () => false,
  target: $isSessionExpired,
});

sample({
  clock: checkSessionFx.done,
  source: $lastAuthedAccountId,
  filter: (lastAuthedId, { result }) => result === null && lastAuthedId !== null,
  fn: () => true,
  target: $isSessionExpired,
});

const sessionHealthCheck = interval({
  timeout: 5 * 60 * 1000,
  start: merge([verifySignatureFx.done, checkSessionFx.done, checkSessionFx.fail]),
  stop: merge([signOutClicked, backendConfigurationModel.events.urlCleared]),
});

sample({
  clock: sessionHealthCheck.tick,
  source: backendConfigurationModel.$backendUrl,
  filter: (url): url is string => url !== null,
  target: checkSessionFx,
});

$isSessionExpired.on(unauthorizedResponseReceived, () => true);
$isSessionExpired.on(
  [verifySignatureFx.done, signOutClicked, backendConfigurationModel.events.urlCleared],
  () => false,
);

const $hasNetworkIssue = createStore(false);
$hasNetworkIssue.on(checkSessionFx.fail, () => true);
$hasNetworkIssue.on(checkSessionFx.done, () => false);
$hasNetworkIssue.on([verifySignatureFx.done, signOutClicked, backendConfigurationModel.events.urlCleared], () => false);

const $isConnectionAlive = combine(
  {
    url: backendConfigurationModel.$backendUrl,
    auth: $authState,
    expired: $isSessionExpired,
    networkIssue: $hasNetworkIssue,
  },
  ({ url, auth, expired, networkIssue }) => url !== null && auth !== null && !expired && !networkIssue,
);

const sessionExpired = createEvent();

const showSessionExpiredToastFx = createEffect(() => {
  toast.error(t('addressBook.auth.sessionExpiredToast'), {
    action: {
      label: t('addressBook.auth.reconnectButton'),
      onClick: () => backendConfigurationModel.events.editStarted(),
    },
  });
});

sample({
  clock: $isSessionExpired,
  source: sessionHealthCheck.isRunning,
  filter: (isRunning, expired) => expired && isRunning,
  target: [sessionExpired, showSessionExpiredToastFx],
});

export const authModel = {
  $authState,
  $authStep,
  $selectedAccountId,
  $selectedChainId,
  $error,
  $connectionResult,
  $isAuthenticated,
  $signableAccounts,
  $isSessionExpired,
  $hasNetworkIssue,
  $isConnectionAlive,

  events: {
    signInClicked,
    signInSucceeded,
    signOutClicked,
    accountSelected,
    chainSelected,
    signConfirmed,
    connectTriggered,
    modalClosed,
    sessionExpired,
    unauthorizedResponseReceived,
    signingCancelled,
  },

  __test: {
    logoutFx,
    checkSessionFx,
    verifySignatureFx,
    $defaultAuthChainId,
    $defaultAuthAccountId,
  },
};
