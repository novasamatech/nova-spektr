import { combine, createEffect, createEvent, createStore, merge, sample } from 'effector';
import { t } from 'i18next';
import { interval, once } from 'patronum';
import { toast } from 'sonner';

import { RelayChains, assert } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { backendAuthService } from '@/domains/backend';
import { type AnyAccount, accountService } from '@/domains/network';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { polkadotExtensionService } from '@/features/extension-wallet';
import { messageSignModel } from '@/features/operations/OperationMessageSign';
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
const signConfirmed = createEvent();
const connectTriggered = createEvent();
const modalClosed = createEvent();
const signingCancelled = createEvent();

// Stores
const $authState = createStore<AuthState | null>(null);
const $authStep = createStore<AuthStep>('selectAccount');
const $selectedAccountId = createStore<AccountId | null>(null);
const $error = createStore<string | null>(null);
const $connectionResult = createStore<ConnectionResult>({ status: 'idle' });
const $challengeId = createStore<string | null>(null);

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
  fn: url => (url ? url.trim().replace(/\/+$/, '') : null) || null,
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

// Auto-select first available account when nothing is selected
sample({
  clock: [signInClicked, backendConfigurationModel.events.modalOpened, backendConfigurationModel.events.editStarted],
  source: { accounts: $signableAccounts, selectedId: $selectedAccountId },
  filter: ({ accounts, selectedId }) => accounts.length > 0 && selectedId === null,
  fn: ({ accounts }) => accounts[0]!.accountId,
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
  source: { account: $selectedAccount },
  filter: ({ account }) => account !== null,
  fn: ({ account }, challengeData) => {
    const signatory = account!.account;
    const messageText = buildSignMessage(challengeData.nonce);
    const message = new TextEncoder().encode(messageText);
    const chainId = accountService.isChainAccount(signatory) ? signatory.chainId : RelayChains.POLKADOT;

    return { message, signatory, chainId };
  },
  target: messageSignModel.init,
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
  clock: checkSessionFx.doneData,
  source: $signableAccounts,
  filter: (_accounts, sessionData) => sessionData !== null,
  fn: (accounts, sessionData): AuthState => {
    assert(sessionData);
    const match = accounts.find(a => a.accountId === sessionData.accountId);

    return {
      accountId: sessionData.accountId as AccountId,
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
  source: $authState,
  filter: (auth, { result }) => result === null && auth !== null,
  fn: () => true,
  target: $isSessionExpired,
});

$authState.on(checkSessionFx.fail, () => null);

const sessionHealthCheck = interval({
  timeout: 5 * 60 * 1000,
  start: merge([verifySignatureFx.done, checkSessionFx.done]),
  stop: merge([signOutClicked, backendConfigurationModel.events.urlCleared]),
});

sample({
  clock: sessionHealthCheck.tick,
  source: backendConfigurationModel.$backendUrl,
  filter: (url): url is string => url !== null,
  target: checkSessionFx,
});

$isSessionExpired.on(checkSessionFx.fail, () => true);
$isSessionExpired.on(
  [verifySignatureFx.done, signOutClicked, backendConfigurationModel.events.urlCleared],
  () => false,
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
  $error,
  $connectionResult,
  $isAuthenticated,
  $signableAccounts,
  $isSessionExpired,

  events: {
    signInClicked,
    signInSucceeded,
    signOutClicked,
    accountSelected,
    signConfirmed,
    connectTriggered,
    modalClosed,
    sessionExpired,
    signingCancelled,
  },

  __test: {
    logoutFx,
    checkSessionFx,
  },
};
