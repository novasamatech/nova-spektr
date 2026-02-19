import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import { once } from 'patronum';

import { type AccountId } from '@/shared/polkadotjs-schemas';
import { walletModel } from '@/entities/wallet';
import { polkadotExtensionService } from '@/features/extension-wallet';
import * as authApi from '../lib/backend-auth-api';
import { signChallenge } from '../lib/backend-auth-sign';

import { backendConfigurationModel } from './backend-configuration-model';

type AuthState = {
  accountId: AccountId;
  accountName: string;
  permissions: string[];
};

type AuthStep = 'selectAccount' | 'signing' | 'error';

// Events
const signInClicked = createEvent();
const signOutClicked = createEvent();
const accountSelected = createEvent<AccountId>();
const signConfirmed = createEvent();
const modalClosed = createEvent();

// Stores
const $authState = createStore<AuthState | null>(null);
const $isAuthModalOpen = createStore(false);
const $authStep = createStore<AuthStep>('selectAccount');
const $selectedAccountId = createStore<AccountId | null>(null);
const $error = createStore<string | null>(null);

const $isAuthenticated = $authState.map((state) => state !== null);

const $extensionAccounts = walletModel.$wallets.map((wallets) => {
  const extensionWallets = wallets.filter(polkadotExtensionService.isExtensionWallet);

  return extensionWallets.flatMap((wallet) => wallet.accounts.filter(polkadotExtensionService.isExtensionAccount));
});

const $selectedAccount = combine($extensionAccounts, $selectedAccountId, (accounts, selectedId) => {
  if (!selectedId) return null;

  return accounts.find((a) => a.accountId === selectedId) ?? null;
});

// Effects
const requestChallengeFx = createEffect(async ({ baseUrl, accountId }: { baseUrl: string; accountId: string }) => {
  return authApi.requestChallenge(baseUrl, accountId);
});

const signAndVerifyFx = createEffect(
  async ({
    baseUrl,
    accountId,
    challengeId,
    nonce,
    extensionSource,
  }: {
    baseUrl: string;
    accountId: string;
    challengeId: string;
    nonce: string;
    extensionSource: string;
  }) => {
    const signature = await signChallenge(extensionSource, accountId, nonce);

    return authApi.verifySignature(baseUrl, { accountId, challengeId, signature });
  },
);

const checkSessionFx = createEffect(async (baseUrl: string) => {
  return authApi.checkSession(baseUrl);
});

const logoutFx = createEffect(async (baseUrl: string) => {
  return authApi.logout(baseUrl);
});

// Wiring: signInClicked → open modal
$isAuthModalOpen.on(signInClicked, () => true);
$authStep.on(signInClicked, () => 'selectAccount');
$selectedAccountId.on(signInClicked, () => null);
$error.on(signInClicked, () => null);

// Auto-select when only one extension account is available
sample({
  clock: signInClicked,
  source: $extensionAccounts,
  filter: (accounts) => accounts.length === 1,
  fn: (accounts) => {
    const account = accounts[0];
    if (!account) throw new Error('Expected exactly one account');

    return account.accountId;
  },
  target: accountSelected,
});

// Wiring: accountSelected
$selectedAccountId.on(accountSelected, (_, id) => id);

// Wiring: modalClosed
$isAuthModalOpen.on(modalClosed, () => false);
$authStep.on(modalClosed, () => 'selectAccount');
$selectedAccountId.on(modalClosed, () => null);
$error.on(modalClosed, () => null);

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

// Wiring: requestChallengeFx.done → signAndVerifyFx
sample({
  clock: requestChallengeFx.doneData,
  source: {
    baseUrl: backendConfigurationModel.$backendUrl,
    accountId: $selectedAccountId,
    account: $selectedAccount,
  },
  filter: ({ baseUrl, accountId, account }) => baseUrl !== null && accountId !== null && account !== null,
  fn: ({ baseUrl, accountId, account }, challengeData) => ({
    baseUrl: baseUrl!,
    accountId: accountId!,
    challengeId: challengeData.challengeId,
    nonce: challengeData.nonce,
    extensionSource: account!.extension,
  }),
  target: signAndVerifyFx,
});

// Wiring: signAndVerifyFx.done → set auth state, close modal
sample({
  clock: signAndVerifyFx.doneData,
  source: { accountId: $selectedAccountId, account: $selectedAccount },
  filter: ({ accountId, account }) => accountId !== null && account !== null,
  fn: ({ accountId, account }, verifyData): AuthState => ({
    accountId: accountId!,
    accountName: account!.name,
    permissions: verifyData.permissions,
  }),
  target: $authState,
});

const signInSucceeded = createEvent();

sample({
  clock: signAndVerifyFx.done,
  fn: () => false,
  target: [$isAuthModalOpen, signInSucceeded],
});

// Wiring: effect failures → error step
sample({
  clock: [requestChallengeFx.failData, signAndVerifyFx.failData],
  fn: (error: Error) => error.message,
  target: $error,
});

$authStep.on([requestChallengeFx.fail, signAndVerifyFx.fail], () => 'error');

// Wiring: signOutClicked → logoutFx
sample({
  clock: signOutClicked,
  source: backendConfigurationModel.$backendUrl,
  filter: (url): url is string => url !== null,
  target: logoutFx,
});

$authState.on(logoutFx.finally, () => null);

// Wiring: urlCleared → clear auth state + logout
sample({
  clock: backendConfigurationModel.events.urlCleared,
  source: backendConfigurationModel.$backendUrl,
  filter: (url): url is string => url !== null,
  target: logoutFx,
});

$authState.on(backendConfigurationModel.events.urlCleared, () => null);

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
  clock: checkSessionFx.doneData,
  source: walletModel.$wallets,
  fn: (wallets, sessionData): AuthState => {
    const extensionWallets = wallets.filter(polkadotExtensionService.isExtensionWallet);
    const allAccounts = extensionWallets.flatMap((w) => w.accounts.filter(polkadotExtensionService.isExtensionAccount));
    const match = allAccounts.find((a) => a.accountId === sessionData.accountId);

    return {
      accountId: sessionData.accountId as AccountId,
      accountName: match?.name ?? '',
      permissions: sessionData.permissions,
    };
  },
  target: $authState,
});

// On session check failure, clear auth state silently
$authState.on(checkSessionFx.fail, () => null);

export const authModel = {
  $authState,
  $isAuthModalOpen,
  $authStep,
  $selectedAccountId,
  $error,
  $isAuthenticated,
  $extensionAccounts,

  events: {
    signInClicked,
    signInSucceeded,
    signOutClicked,
    accountSelected,
    signConfirmed,
    modalClosed,
  },
};
