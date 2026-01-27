import { type SessionTypes } from '@walletconnect/types';
import { attach, combine, createEvent, createStore, sample } from 'effector';
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

const flow = createFlow<{
  type: 'novawallet' | 'walletconnect' | null;
  onComplete: (walletName: string, type: WalletTypeName) => void;
}>({ type: null, onComplete: noop });

const reset = createEvent();

const $step = createStore(Step.SCAN).reset(reset);

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

const createSessionFx = attach({ effect: walletConnect.createSession });
const createWalletConnectWalletFx = attach({ effect: walletModel.createWallet });
const requestIdentityFx = attach({ effect: identity.request });

sample({
  clock: $accounts,
  filter: accounts => accounts.length > 0,
  fn: accounts => ({
    chainId: IDENTITY_CHAIN,
    accounts: [accounts[0].accountId],
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
  target: form.reset,
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

export const pairingFormModel = {
  flow,

  form,
  $uri: walletConnect.$pairingUri,
  $session,
  $accounts,
  $step,
  $identityPending: requestIdentityFx.pending,
  reset,
};
