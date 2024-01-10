import { ProxyType, WalletType } from '@shared/core';
import type { ID, AccountId, CallHash, ChainId, Timepoint } from '@shared/core';

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
  originatorAccountId: AccountId;
  smpRoomId: string;
};

export type MultisigInvite = MultisigBaseNotification & {
  signatories: AccountId[];
  threshold: number;
  multisigAccountName: string;
};

export type MultisigOperation = MultisigBaseNotification & {
  callHash: CallHash;
  callTimepoint: Timepoint;
  chainId: ChainId;
};

export type ProxyAction = BaseNotification & {
  proxyAccountId: AccountId;
  proxiedAccountId: AccountId;
  proxyType: ProxyType;
  chainId: ChainId;
  proxyWalletName: string;
  proxiedWalletName: string;
  proxiedWalletType: WalletType;
};

export type Notification = MultisigInvite | MultisigOperation | ProxyAction;
