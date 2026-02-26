import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import { once } from 'patronum';

import { type ChainId, type CryptoType, type HexString } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { polkadotExtensionService } from '@/features/extension-wallet';
import * as authApi from '../lib/backend-auth-api';
import { createAuthQrPayload, signChallenge } from '../lib/backend-auth-sign';

import { backendConfigurationModel } from './backend-configuration-model';

type AuthState = {
  accountId: AccountId;
  accountName: string;
  permissions: string[];
};

type AuthStep = 'selectAccount' | 'signing' | 'vaultSign' | 'error';

type ConnectionResult = { status: 'idle' } | { status: 'success' } | { status: 'error'; message: string };

export type SignableAccount =
  | { signingMethod: 'extension'; accountId: AccountId; name: string; walletName: string; extension: string }
  | {
      signingMethod: 'vault';
      accountId: AccountId;
      name: string;
      walletName: string;
      chainId: ChainId;
      cryptoType: CryptoType;
    };

type ExtensionSignableAccount = Extract<SignableAccount, { signingMethod: 'extension' }>;
type VaultSignableAccount = Extract<SignableAccount, { signingMethod: 'vault' }>;

type ChallengeData = {
  challengeId: string;
  nonce: string;
};

function isExtensionSignable(account: SignableAccount): account is ExtensionSignableAccount {
  return account.signingMethod === 'extension';
}

function isVaultSignable(account: SignableAccount): account is VaultSignableAccount {
  return account.signingMethod === 'vault';
}

// Events
const signInClicked = createEvent();
const signOutClicked = createEvent();
const accountSelected = createEvent<AccountId>();
const signConfirmed = createEvent();
const connectTriggered = createEvent();
const modalClosed = createEvent();
const vaultSignatureScanned = createEvent<HexString>();

// Stores
const $authState = createStore<AuthState | null>(null);
const $authStep = createStore<AuthStep>('selectAccount');
const $selectedAccountId = createStore<AccountId | null>(null);
const $error = createStore<string | null>(null);
const $connectionResult = createStore<ConnectionResult>({ status: 'idle' });
const $qrPayload = createStore<Uint8Array | null>(null);
const $challengeData = createStore<ChallengeData | null>(null);

const $isAuthenticated = $authState.map((state) => state !== null);

const $signableAccounts = walletModel.$wallets.map((wallets): SignableAccount[] => {
  const extensionAccounts: SignableAccount[] = wallets
    .filter(polkadotExtensionService.isExtensionWallet)
    .flatMap((wallet) =>
      wallet.accounts.filter(polkadotExtensionService.isExtensionAccount).map(
        (account): SignableAccount => ({
          signingMethod: 'extension',
          accountId: account.accountId,
          name: account.name,
          walletName: wallet.name,
          extension: account.extension,
        }),
      ),
    );

  const vaultAccounts: SignableAccount[] = wallets
    .filter((w) => walletUtils.isPolkadotVaultGroup(w))
    .flatMap((wallet) =>
      wallet.accounts.flatMap((account): SignableAccount[] => {
        if (accountUtils.isVaultChainAccount(account) || accountUtils.isVaultShardAccount(account)) {
          return [
            {
              signingMethod: 'vault',
              accountId: account.accountId,
              name: account.name,
              walletName: wallet.name,
              chainId: account.chainId,
              cryptoType: account.cryptoType,
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

const vaultVerifyFx = createEffect(
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
    return authApi.verifySignature(baseUrl, { accountId, challengeId, signature });
  },
);

const checkSessionFx = createEffect(async (baseUrl: string) => {
  return authApi.checkSession(baseUrl);
});

const logoutFx = createEffect(async (baseUrl: string) => {
  return authApi.logout(baseUrl);
});

// Wiring: connectTriggered → save URL + begin auth
// Step 1: Save draft URL to $backendUrl (must be declared before auth trigger)
sample({
  clock: connectTriggered,
  source: backendConfigurationModel.$draftUrl,
  fn: (url) => url?.trim() ?? null,
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
$qrPayload.on(resetAuthUiTriggers, () => null);
$challengeData.on(resetAuthUiTriggers, () => null);

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

// Wiring: requestChallengeFx.done → route based on account type

// Extension path: requestChallengeFx.done → signAndVerifyFx
sample({
  clock: requestChallengeFx.doneData,
  source: {
    baseUrl: backendConfigurationModel.$backendUrl,
    accountId: $selectedAccountId,
    account: $selectedAccount,
  },
  filter: ({ baseUrl, accountId, account }) =>
    baseUrl !== null && accountId !== null && account !== null && isExtensionSignable(account),
  fn: ({ baseUrl, accountId, account }, challengeData) => {
    const extensionAccount = account!;
    if (!isExtensionSignable(extensionAccount)) throw new Error('Expected extension account');

    return {
      baseUrl: baseUrl!,
      accountId: accountId!,
      challengeId: challengeData.challengeId,
      nonce: challengeData.nonce,
      extensionSource: extensionAccount.extension,
    };
  },
  target: signAndVerifyFx,
});

// Vault path: requestChallengeFx.done → create QR payload + store challenge data + show QR
sample({
  clock: requestChallengeFx.doneData,
  source: { account: $selectedAccount },
  filter: ({ account }) => account !== null && isVaultSignable(account),
  fn: ({ account }, challengeData) => {
    const vaultAccount = account!;
    if (!isVaultSignable(vaultAccount)) throw new Error('Expected vault account');

    return createAuthQrPayload(vaultAccount.accountId, challengeData.nonce, vaultAccount.chainId, vaultAccount.cryptoType);
  },
  target: $qrPayload,
});

sample({
  clock: requestChallengeFx.doneData,
  source: { account: $selectedAccount },
  filter: ({ account }) => account !== null && isVaultSignable(account),
  fn: (_, challengeData): ChallengeData => ({
    challengeId: challengeData.challengeId,
    nonce: challengeData.nonce,
  }),
  target: $challengeData,
});

// Set auth step to vaultSign when vault account gets challenge
sample({
  clock: requestChallengeFx.doneData,
  source: { account: $selectedAccount },
  filter: ({ account }) => account !== null && isVaultSignable(account),
  fn: (): AuthStep => 'vaultSign',
  target: $authStep,
});

// Wiring: vaultSignatureScanned → vaultVerifyFx
sample({
  clock: vaultSignatureScanned,
  source: {
    baseUrl: backendConfigurationModel.$backendUrl,
    accountId: $selectedAccountId,
    challengeData: $challengeData,
  },
  filter: ({ baseUrl, accountId, challengeData }) =>
    baseUrl !== null && accountId !== null && challengeData !== null,
  fn: ({ baseUrl, accountId, challengeData }, signature) => ({
    baseUrl: baseUrl!,
    accountId: accountId!,
    challengeId: challengeData!.challengeId,
    signature,
  }),
  target: vaultVerifyFx,
});

$authStep.on(vaultSignatureScanned, () => 'signing');

// Wiring: signAndVerifyFx.done / vaultVerifyFx.done → set auth state, close modal
sample({
  clock: [signAndVerifyFx.doneData, vaultVerifyFx.doneData],
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
  clock: [signAndVerifyFx.done, vaultVerifyFx.done],
  target: [signInSucceeded, backendConfigurationModel.events.connectCompleted],
});

// Connection result tracking
$connectionResult
  .on([signAndVerifyFx.done, vaultVerifyFx.done], (): ConnectionResult => ({ status: 'success' }))
  .on([connectTriggered, signInClicked, backendConfigurationModel.events.urlCleared], (): ConnectionResult => ({ status: 'idle' }));

sample({
  clock: [requestChallengeFx.failData, signAndVerifyFx.failData, vaultVerifyFx.failData],
  fn: (error: Error): ConnectionResult => ({ status: 'error', message: error.message }),
  target: $connectionResult,
});

// Wiring: effect failures → error step
sample({
  clock: [requestChallengeFx.failData, signAndVerifyFx.failData, vaultVerifyFx.failData],
  fn: (error: Error) => error.message,
  target: $error,
});

$authStep.on([requestChallengeFx.fail, signAndVerifyFx.fail, vaultVerifyFx.fail], () => 'error');

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
  source: $signableAccounts,
  fn: (accounts, sessionData): AuthState => {
    const match = accounts.find((a) => a.accountId === sessionData.accountId);

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
  $authStep,
  $selectedAccountId,
  $error,
  $connectionResult,
  $isAuthenticated,
  $signableAccounts,
  $qrPayload,

  events: {
    signInClicked,
    signInSucceeded,
    signOutClicked,
    accountSelected,
    signConfirmed,
    connectTriggered,
    modalClosed,
    vaultSignatureScanned,
  },
};
