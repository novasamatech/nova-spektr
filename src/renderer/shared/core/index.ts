export { kernelModel } from './model/kernel-model';

export * from './types/general';
export * from './types/utility';

export type { Contact } from './types/contact';
export type { Signatory } from './types/signatory';

export type {
  Wallet,
  WalletsMap,
  PolkadotVaultWallet,
  SingleShardWallet,
  MultiShardWallet,
  MultisigWallet,
  WatchOnlyWallet,
  WalletConnectWallet,
  NovaWalletWallet,
  WalletFamily,
  PolkadotVaultGroup,
  WalletConnectGroup,
  ProxiedWallet,
  SignableWalletFamily,
} from './types/wallet';
export { WalletType, SigningType } from './types/wallet';

export { AccountType, KeyType } from './types/account';
export type {
  Account,
  BaseAccount,
  ChainAccount,
  MultisigAccount,
  WalletConnectAccount,
  ProxiedAccount,
  ShardAccount,
  DraftAccount,
} from './types/account';

export { AssetType, StakingType } from './types/asset';
export type { Asset, OrmlExtras, StatemineExtras } from './types/asset';

export { LockTypes } from './types/balance';
export type { Balance, BalanceLock } from './types/balance';

export type { ChainMetadata } from './types/metadata';

export type { Chain, Explorer, RpcNode } from './types/chain';
export { ChainOptions, ExternalType } from './types/chain';

export { ConnectionType, ConnectionStatus } from './types/connection';
export type { Connection } from './types/connection';

export type { Identity, SubIdentity } from './types/identity';

export type { Validator } from './types/validator';

export { RewardsDestination } from './types/stake';
export type { Stake, Unlocking } from './types/stake';

export type {
  ProxyAccount,
  PartialProxyAccount,
  PartialProxiedAccount,
  ProxyDeposits,
  ProxyGroup,
} from './types/proxy';
export { ProxyType, ProxyVariant } from './types/proxy';

export type { Notification, MultisigInvite, MultisigOperation, ProxyAction } from './types/notification';
export { NotificationType } from './types/notification';

export { XcmPallets } from './types/substrate';

export { ReferendumType } from './types/referendum';
export type { ReferendumInfo, ApprovedReferendum, RejectedReferendum, OngoingReferendum } from './types/referendum';
