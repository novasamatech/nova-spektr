import { AccountId, CallHash, ChainId, Timepoint } from '../../../domain/shared-kernel';

export const enum MultisigNotificationType {
  ACCOUNT_INVITED = 'MultisigAccountInvitedNotification',
  MST_CREATED = 'MultisigCreatedNotification',
  MST_APPROVED = 'MultisigApprovedNotification',
  MST_EXECUTED = 'MultisigExecutedNotification',
  MST_CANCELLED = 'MultisigCancelledNotification',
}

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

export type Notification = {
  read: boolean;
  dateCreated: number;
  type: MultisigNotificationType;
} & MultisigNotification;
