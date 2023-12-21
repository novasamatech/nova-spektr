import type { AccountId, CallHash, ChainId, Timepoint } from '@shared/core';
import { ProxyType } from '@entities/proxy';

export enum MultisigNotificationType {
  ACCOUNT_INVITED = 'MultisigAccountInvitedNotification',
  MST_CREATED = 'MultisigCreatedNotification',
  MST_APPROVED = 'MultisigApprovedNotification',
  MST_EXECUTED = 'MultisigExecutedNotification',
  MST_CANCELLED = 'MultisigCancelledNotification',
}

export enum ProxyNotificationType {
  PROXY_CREATED = 'ProxyCreatedNotification',
}

export type ProxyCreatedNotification = {
  proxyAccountId: AccountId;
  proxiedAccountId: AccountId;
  proxyType: ProxyType;
  chainId: ChainId;
};

export type MultisigAccountInvitedNotification = {
  signatories: AccountId[];
  threshold: number;
  multisigAccountName: string;
};

export type MultisigOperationNotification = {
  callHash: CallHash;
  callTimepoint: Timepoint;
  chainId: ChainId;
};

export type MultisigNotification = {
  multisigAccountId: AccountId;
  originatorAccountId: AccountId;
  smpRoomId: string;
} & (MultisigAccountInvitedNotification | MultisigOperationNotification);

type NotificationBase = {
  read: boolean;
  dateCreated: number;
};

export type Notification = NotificationBase &
  (
    | ({ type: MultisigNotificationType } & MultisigNotification)
    | ({ type: ProxyNotificationType } & ProxyCreatedNotification)
  );
