import { ProxyType, WalletType } from '@shared/core';
import type { ID, AccountId, CallHash, ChainId, Timepoint, ProxyVariant } from '@shared/core';

export const enum NotificationType {
  MULTISIG_INVITE = 'MultisigAccountInvitedNotification',
  MULTISIG_CREATED = 'MultisigCreatedNotification',
  MULTISIG_APPROVED = 'MultisigApprovedNotification',
  MULTISIG_EXECUTED = 'MultisigExecutedNotification',
  MULTISIG_CANCELLED = 'MultisigCancelledNotification',

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
  network: ChainId;
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
