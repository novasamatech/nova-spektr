import { AccountId, CallHash, ChainId, Timepoint } from '../../../domain/shared-kernel';
import { ObjectValues } from '@renderer/domain/utility';

export const MultisigNotificationType = {
  ACCOUNT_INVITED: 'MultisigAccountInvitedNotification',
  MST_CREATED: 'MultisigCreatedNotification',
  MST_APPROVED: 'MultisigApprovedNotification',
  MST_EXECUTED: 'MultisigExecutedNotification',
  MST_CANCELLED: 'MultisigCancelledNotification',
} as const;

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
  type: ObjectValues<typeof MultisigNotificationType>;
} & MultisigNotification;
