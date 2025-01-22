import { type SessionTypes } from '@walletconnect/types';
import { attach, combine, createEvent, createStore, sample } from 'effector';
import { createGate } from 'effector-react';

import { AccountType, CryptoType, SigningType, WalletType, type WcAccount } from '@/shared/core';
import { waitFor } from '@/shared/effector';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { proxiesModel } from '@/features/proxies';
import { walletConnect, walletConnectService } from '@/features/wallet-wallet-connect';
import { Step } from '../lib/constants';

const reset = createEvent();
const createWallet = createEvent<{ name: string }>();
const flow = createGate<'novawallet' | 'walletconnect' | null>({ defaultState: null });

const readyToPair = waitFor({
  source: flow.open,
  clock: walletConnect.$client,
  filter: nonNullable,
  reset: flow.close,
});

const $step = createStore(Step.SCAN).reset(reset);

/**
 * Pairing session
 */
const $session = createStore<SessionTypes.Struct | null>(null);

/**
 * Accounts from successful pairing response
 */
const $accounts = combine($session, networkModel.$chains, (session, chains) => {
  if (nullable(session)) return [];

  return walletConnectService.getAccountsFromSession(session, Object.values(chains));
});

const createSessionFx = attach({ effect: walletConnect.createSession });
const createWalletConnectWalletFx = attach({ effect: walletModel.createWallet });

sample({
  clock: createWallet,
  source: { accounts: $accounts, session: $session, walletType: flow.state },
  fn({ accounts, session, walletType }, { name }) {
    const wcAccounts = accounts.map<Omit<WcAccount, 'id' | 'walletId'>>(({ accountId, chain }) => {
      return {
        type: 'chain',
        name: name.trim(),
        accountId,
        accountType: AccountType.WALLET_CONNECT,
        signingType: SigningType.WALLET_CONNECT,
        // TODO check
        cryptoType: CryptoType.SR25519,
        chainId: chain.chainId,
        signingExtras: { pairingTopic: session?.pairingTopic, sessionTopic: session?.topic },
      };
    });

    return {
      external: false,
      accounts: wcAccounts,
      wallet: {
        name: name.trim(),
        type: walletType === 'novawallet' ? WalletType.NOVA_WALLET : WalletType.WALLET_CONNECT,
        signingType: SigningType.WALLET_CONNECT,
      },
    };
  },
  target: createWalletConnectWalletFx,
});

sample({
  clock: createWalletConnectWalletFx.done,
  target: proxiesModel.findAllProxies,
});

sample({
  clock: readyToPair,
  source: networkModel.$chains,
  fn: (chains, { trigger: client }) => ({
    client,
    chains: Object.values(chains).map(c => c.chainId),
  }),
  target: createSessionFx,
});

sample({
  clock: createSessionFx.doneData,
  target: $session,
});

const resetSession = sample({
  clock: reset,
  source: { session: $session },
}).filterMap(({ session }) => {
  if (session) return { pairingTopic: session.pairingTopic };
});

sample({
  clock: resetSession,
  target: walletConnect.removeSession,
});

sample({
  clock: flow.open,
  fn: () => Step.SCAN,
  target: $step,
});

sample({
  clock: createSessionFx.done,
  source: $step,
  filter: step => step === Step.SCAN,
  fn: () => Step.MANAGE,
  target: $step,
});

sample({
  clock: createSessionFx.fail,
  source: $step,
  filter: step => step === Step.SCAN,
  fn: () => Step.REJECT,
  target: $step,
});

export const pairingForm = {
  flow,
  $uri: walletConnect.$pairingUri,
  $session,
  $accounts,
  $step,
  reset,
  createWallet,
};
