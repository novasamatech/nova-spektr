import { ID, NotificationDS } from '@shared/api/storage';
import type { AccountId, CallHash, ChainId, ProxyType, Timepoint } from '@shared/core';

export interface INotificationService {
  getNotifications: <T extends Notification>(where?: Partial<T>) => Promise<NotificationDS[]>;
  getLiveNotifications: <T extends Notification>(where?: Partial<T>) => NotificationDS[];
  addNotification: (notification: Notification) => Promise<ID>;
}

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

export type ProxyCreatedNotificationType = {
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
    | ({ type: ProxyNotificationType } & ProxyCreatedNotificationType)
  );
