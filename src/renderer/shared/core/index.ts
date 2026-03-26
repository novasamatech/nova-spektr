export { kernelModel } from './model/kernel-model';

export * from './types/general';
export * from './types/utility';

export type { BackendContact, Contact, ContactTag, LocalContact } from './types/contact';
export { isBackendContact, isLocalContact } from './types/contact';
export type { Signatory } from './types/signatory';

export type {
  FlexibleMultisigWallet,
  MultisigWallet,
  NovaWalletWallet,
  PolkadotVaultGroup,
  PolkadotVaultWallet,
  ProxiedWallet,
  SignableWalletFamily,
  SingleShardWallet,
  Wallet,
  WalletConnectGroup,
  WalletConnectWallet,
  WalletFamily,
  WalletsMap,
  WatchOnlyWallet,
} from './types/wallet';
export { SigningType, WalletType } from './types/wallet';

export { AccountNameType, AccountType, KeyType } from './types/account';
export type {
  DraftAccount,
  FlexibleMultisigAccount,
  MultisigAccount,
  MultisigSignatoryAccount,
  ProxiedAccount,
  ProxiedConnection,
  VaultBaseAccount,
  VaultChainAccount,
  VaultShardAccount,
  WatchOnlyAccount,
  WcAccount,
} from './types/account';

export { AssetType, StakingType } from './types/asset';
export type { Asset, AssetByChains, AssetId, OrmlExtras, PortfolioTokenBalance, StatemineExtras } from './types/asset';

export { LockTypes } from './types/balance';
export type { AssetBalance, Balance, BalanceDraft, BalanceId, BalanceMap, TransferableMode } from './types/balance';

export type { ChainMetadata } from './types/metadata';

export type { Chain, Explorer, RpcNode } from './types/chain';
export { ChainOptions, ExternalType } from './types/chain';

export { ConnectionStatus, ConnectionType } from './types/connection';
export type { Connection } from './types/connection';

export type { Identity, SubIdentity } from './types/identity';

export type { Validator } from './types/validator';

export { RewardsDestination } from './types/stake';
export type { Stake, Unlocking } from './types/stake';

export type { PartialProxiedAccount, PartialProxyAccount, ProxyAccount, ProxyType } from './types/proxy';
export { ProxyTypeOrder, ProxyTypes, ProxyVariant } from './types/proxy';

export type {
  CreateFlexibleMultisigOperationParams,
  CreateMultisigCreatedParams,
  CreateMultisigEventParams,
  CreateMultisigOperationParams,
  CreateNotificationParams,
  CreateProxyActionParams,
  FlexibleMultisigOperationNotification,
  MultisigCreated,
  MultisigEventNotification,
  MultisigOperationNotification,
  Notification,
  NotificationStatus,
  ProxyAction,
} from './types/notification';
export { NotificationEvent, NotificationType } from './types/notification';

export { XcmPallets } from './types/substrate';

export { MultisigTxFinalStatus, MultisigTxInitStatus, TransactionType, WrapperKind } from './types/transaction';
export type {
  DecodedTransaction,
  MultisigTxStatus,
  MultisigTxWrapper,
  ProxyTransaction,
  ProxyTxWrapper,
  SigningStatus,
  Transaction,
  TxWrapper,
  TxWrappers_OLD,
  WrapAsMulti,
} from './types/transaction';

export type {
  LinearDecreasingCurve,
  ReciprocalCurve,
  SteppedDecreasingCurve,
  TrackId,
  TrackInfo,
  TrackLocks,
  VotingCurve,
  VotingThreshold,
} from './types/track';

export type {
  ApprovedReferendum,
  CancelledReferendum,
  CompletedReferendum,
  Deposit,
  KilledReferendum,
  OngoingReferendum,
  Proposal,
  Referendum,
  ReferendumId,
  ReferendumStatus,
  ReferendumType,
  RejectedReferendum,
  SpendProposal,
  Tally,
  TimedOutReferendum,
} from './types/referendum';

export type {
  AccountVote,
  CastingVoting,
  Conviction,
  DelegatingVoting,
  DelegationBalanceMap,
  DelegationTracksMap,
  SplitAbstainVote,
  SplitVote,
  StandardVote,
  Voting,
  VotingMap,
} from './types/voting';

export type {
  ModalNotification,
  ModalNotificationProps,
  ToastNotification,
  ToastNotificationProps,
  ToastPosition,
  ToastVariant,
} from './types/notificationService';
