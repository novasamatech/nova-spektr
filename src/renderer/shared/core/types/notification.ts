import { type AccountId } from '@/shared/polkadotjs-schemas';

import { type CallHash, type ChainId, type ID, type Timepoint } from './general';
import { type ProxyType, type ProxyVariant } from './proxy';

export const enum NotificationType {
  MULTISIG_CREATED = 'MultisigCreatedNotification',
  MULTISIG_APPROVED = 'MultisigApprovedNotification',
  MULTISIG_EXECUTED = 'MultisigExecutedNotification',
  MULTISIG_CANCELLED = 'MultisigCancelledNotification',

  FLEXIBLE_MULTISIG_CREATED = 'FlexibleMultisigCreatedNotification',
  FLEXIBLE_MULTISIG_EDITED = 'FlexibleMultisigEditedNotification',

  PROXY_CREATED = 'ProxyCreatedNotification',
  PROXY_REMOVED = 'ProxyRemovedNotification',

  MULTISIG_OPERATION = 'MultisigOperationNotification',
}

export type NotificationStatus = 'info' | 'success' | 'error';

type BaseNotification = {
  id: ID;
  key: string;
  read: boolean;
  dateCreated: number;
  type: NotificationType;
  status: NotificationStatus;
  issuer: AccountId;
  chainId: ChainId;
  title: string;
  description?: string;
  deepLink?: string;
};

type MultisigBaseNotification = BaseNotification & {
  multisigAccountId: AccountId;
};

export type MultisigCreated = MultisigBaseNotification & {
  signatories: AccountId[];
  threshold: number;
  multisigAccountName: string;
};

export type FlexibleMultisigOperationNotification = MultisigBaseNotification & {
  walletId: number;
  accountId: AccountId;
  accountName: string;
  signatories: AccountId[];
  threshold: number;
};

export type MultisigOperationNotification = MultisigBaseNotification & {
  callHash: CallHash;
  callTimepoint: Timepoint;
  operationId: string;
};

export type ProxyAction = BaseNotification & {
  proxyType: ProxyType;
  proxyVariant: ProxyVariant;
  proxyAccountId: AccountId;
  proxiedAccountId: AccountId;
};

export type Notification =
  | MultisigCreated
  | FlexibleMultisigOperationNotification
  | MultisigOperationNotification
  | ProxyAction;

type NotificationInput<T extends Notification> = Omit<T, 'id' | 'read' | 'dateCreated'>;

export type CreateMultisigCreatedParams = NotificationInput<MultisigCreated>;
export type CreateFlexibleMultisigOperationParams = NotificationInput<FlexibleMultisigOperationNotification>;
export type CreateMultisigOperationParams = NotificationInput<MultisigOperationNotification>;
export type CreateProxyActionParams = NotificationInput<ProxyAction>;

export type CreateNotificationParams =
  | CreateMultisigCreatedParams
  | CreateFlexibleMultisigOperationParams
  | CreateMultisigOperationParams
  | CreateProxyActionParams;
