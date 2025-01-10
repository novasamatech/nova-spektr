import { type AccountId } from '@/shared/polkadotjs-schemas';

import { type CallHash, type ChainId, type ID, type Timepoint } from './general';
import { type ProxyType, type ProxyVariant } from './proxy';
import { type WalletType } from './wallet';

export const enum NotificationType {
  MULTISIG_CREATED = 'MultisigCreatedNotification',
  MULTISIG_APPROVED = 'MultisigApprovedNotification',
  MULTISIG_EXECUTED = 'MultisigExecutedNotification',
  MULTISIG_CANCELLED = 'MultisigCancelledNotification',

  FLEXIBLE_MULTISIG_CREATED = 'FlexibleMultisigCreatedNotification',

  PROXY_CREATED = 'ProxyCreatedNotification',
  PROXY_REMOVED = 'ProxyRemovedNotification',
}

type BaseNotification = {
  id: ID;
  read: boolean;
  dateCreated: number;
  type: NotificationType;
};

type MultisigBaseNotification = BaseNotification & {
  multisigAccountId: AccountId;
};

export type MultisigCreated = MultisigBaseNotification & {
  signatories: AccountId[];
  threshold: number;
  multisigAccountName: string;
  chainId: ChainId;
};

export type FlexibleMultisigCreated = MultisigBaseNotification & {
  walletId: number;
  signatories: AccountId[];
  threshold: number;
  multisigAccountName: string;
  chainId: ChainId;
};

export type MultisigOperation = MultisigBaseNotification & {
  callHash: CallHash;
  callTimepoint: Timepoint;
  chainId: ChainId;
};

export type ProxyAction = BaseNotification & {
  chainId: ChainId;
  proxyType: ProxyType;
  proxyVariant: ProxyVariant;
  proxyAccountId: AccountId;
  proxyWalletName: string;
  proxyWalletType: WalletType;
  proxiedAccountId: AccountId;
  proxiedWalletName: string;
};

export type Notification = MultisigCreated | MultisigOperation | ProxyAction;
