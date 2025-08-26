import { type SessionTypes } from '@walletconnect/types';

import { chainsService } from '@/shared/api/network';
import {
  AccountType,
  type Chain,
  type ChainId,
  CryptoType,
  type NovaWalletWallet,
  SigningType,
  type Wallet,
  type WalletConnectWallet,
  WalletType,
  type WcAccount,
} from '@/shared/core';
import { nonNullable, nullable, toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount, type AnyAccountDraft, accountService } from '@/domains/network';

import {
  DEFAULT_POLKADOT_EVENTS,
  DEFAULT_POLKADOT_METHODS,
  FIRST_CHAIN_ID_SYMBOL,
  LAST_CHAIN_ID_SYMBOL,
} from './constants';

function isNovaWallet(wallet?: Wallet): wallet is NovaWalletWallet {
  return wallet?.type === WalletType.NOVA_WALLET;
}

function isWalletConnect(wallet?: Wallet): wallet is WalletConnectWallet {
  return wallet?.type === WalletType.WALLET_CONNECT;
}

function isWalletConnectGroup(wallet?: Wallet): wallet is NovaWalletWallet | WalletConnectWallet {
  return isNovaWallet(wallet) || isWalletConnect(wallet);
}

function isWalletConnectAccount(account: Partial<AnyAccount>): account is WcAccount {
  return (
    // @ts-expect-error Partial type breaks required type field usage
    accountService.isChainAccount(account) &&
    'accountType' in account &&
    account.accountType === AccountType.WALLET_CONNECT
  );
}

function getWalletConnectChains(chains: Pick<Chain, 'chainId'>[]): string[] {
  return chains.map(c => getWalletConnectChainId(c.chainId));
}

function getWalletConnectChainId(chainId: ChainId): string {
  return `polkadot:${chainId.slice(FIRST_CHAIN_ID_SYMBOL, LAST_CHAIN_ID_SYMBOL)}`;
}

function createNamespaces(chains: ChainId[]) {
  return {
    polkadot: {
      chains: chains.map(getWalletConnectChainId),
      methods: [DEFAULT_POLKADOT_METHODS.POLKADOT_SIGN_TRANSACTION],
      events: [DEFAULT_POLKADOT_EVENTS.CHAIN_CHANGED, DEFAULT_POLKADOT_EVENTS.ACCOUNTS_CHANGED],
    },
  };
}

function getAccountsFromSession(session: SessionTypes.Struct, chains: Chain[]) {
  if (nullable(session)) return [];

  const accounts = session.namespaces.polkadot.accounts
    .map(meta => {
      const [_, chainId, address] = meta.split(':') || [];
      if (nullable(chainId) || nullable(address)) return null;
      const accountId = toAccountId(address);

      return {
        chainId,
        accountId,
      };
    })
    .filter(nonNullable);

  const sortedChains = chainsService.sortChains(chains);
  const res: { chain: Chain; accountId: AccountId }[] = [];

  for (const chain of sortedChains) {
    const accountsOnChain = accounts.filter(({ chainId }) => chain.chainId.includes(chainId));

    for (const meta of accountsOnChain) {
      res.push({
        accountId: meta.accountId,
        chain,
      });
    }
  }

  return res;
}

type CreateAccountParams = {
  walletId: number;
  name: string;
  accountId: AccountId;
  chainId: ChainId;
  session: SessionTypes.Struct;
};

function createAccount({
  walletId,
  name,
  accountId,
  chainId,
  session,
}: CreateAccountParams): AnyAccountDraft<WcAccount> {
  return {
    type: 'chain',
    walletId,
    name,
    accountId,
    accountType: AccountType.WALLET_CONNECT,
    signingType: SigningType.WALLET_CONNECT,
    cryptoType: CryptoType.SR25519,
    chainId: chainId,
    signingExtras: { pairingTopic: session?.pairingTopic, sessionTopic: session?.topic },
  };
}

function updateAccount(account: WcAccount, session: SessionTypes.Struct): WcAccount {
  return {
    ...account,
    signingExtras: {
      pairingTopic: session.pairingTopic,
      sessionTopic: session.topic,
    },
  };
}

function hasSameTopic(account: WcAccount, session: SessionTypes.Struct) {
  return (
    account.signingExtras.pairingTopic === session.pairingTopic && account.signingExtras.sessionTopic === session.topic
  );
}

function isConnected(sessions: Record<string, SessionTypes.Struct>, pairingTopic: string): boolean {
  const session = sessions[pairingTopic];

  return nonNullable(session) && session.acknowledged;
}

function isAccountConnected(sessions: Record<string, SessionTypes.Struct>, account: AnyAccount): boolean {
  if (!isWalletConnectAccount(account) || !account.signingExtras.pairingTopic) return false;

  return isConnected(sessions, account.signingExtras.pairingTopic);
}

function areAccountsConnected(sessions: Record<string, SessionTypes.Struct>, accounts: AnyAccount[]): boolean {
  return accounts.every(a => isAccountConnected(sessions, a));
}

export const walletConnectService = {
  isNovaWallet,
  isWalletConnect,
  isWalletConnectGroup,
  isWalletConnectAccount,

  isConnected,
  isAccountConnected,
  areAccountsConnected,

  hasSameTopic,

  getWalletConnectChains,
  getWalletConnectChainId,
  getAccountsFromSession,

  createNamespaces,
  createAccount,
  updateAccount,
};
