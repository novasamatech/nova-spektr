import { EventType, MatrixEvent, Room } from 'matrix-js-sdk';

import { HexString } from '@renderer/domain/types';

// =====================================================
// ============ SecureMessenger interface ==============
// =====================================================

export interface ISecureMessenger {
  // Init
  init: () => Promise<void | never>;
  loginWithCreds: (login: string, password: string) => Promise<void | never>;
  loginFromCache: () => Promise<void | never>;
  logout: () => Promise<void | never>;
  registration: (login: string, password: string) => Promise<void | never>;
  stopClient: () => void;

  // Actions
  startRoomCreation: (mstAccountAddress: string) => Promise<RoomSignature | never>;
  finishRoomCreation: (params: RoomParams) => Promise<void | never>;
  cancelRoomCreation: (roomId: string) => Promise<void | never>;
  joinRoom: (roomId: string) => Promise<void | never>;
  leaveRoom: (roomId: string) => Promise<void | never>;
  invite: (roomId: string, signatoryId: string) => Promise<void | never>;
  listOfOmniRooms: (type: Membership.INVITE | Membership.JOIN) => Room[];
  setRoom: (roomId: string) => void;
  readTimeline: () => Promise<MSTPayload[] | never>;
  sendMessage: (message: string) => void;
  markAsRead: (event: MatrixEvent) => Promise<void | never>;
  setupSubscribers: (handlers: Callbacks) => void;
  clearSubscribers: () => void;
  checkUserExists: (userId: string) => Promise<boolean>;

  // Verification
  verifyWithKey: (securityKey: string) => Promise<boolean | never>;
  verifyWithPhrase: (securityPhrase: string) => Promise<boolean | never>;

  // MST operations
  mstInitiate: (params: MstParams) => void;
  mstApprove: (params: MstParams) => void;
  mstFinalApprove: (params: MstParams) => void;
  mstCancel: (params: MstParams) => void;

  // Properties
  userId: string;
  isLoggedIn: boolean;
  isSynced: boolean;
  isVerified: boolean;
  sessionKey: any;
}

// =====================================================
// ======================= General =====================
// =====================================================

export const enum Membership {
  INVITE = 'invite',
  JOIN = 'join',
  LEAVE = 'leave',
}

export type Signatory = {
  matrixAddress: string;
  accountId: string;
  isInviter?: boolean;
};

export type RoomSignature = Record<'roomId' | 'sign', string>;

export type RoomParams = {
  roomId: string;
  signature: string;
  accountName: string;
  mstAccountAddress: string;
  inviterPublicKey: string;
  threshold: number;
  signatories: Signatory[];
};

export type OmniExtras = {
  mst_account: {
    accountName: string;
    threshold: number;
    signatories: string[];
    address: string;
  };
  invite: {
    signature: string;
    public_key: string;
  };
};

// =====================================================
// ============== MST Events / Callbacks ===============
// =====================================================

export enum OmniMstEvents {
  INIT = 'io.novafoundation.omni.mst_initiated',
  APPROVE = 'io.novafoundation.omni.mst_approved',
  FINAL_APPROVE = 'io.novafoundation.omni.mst_executed',
  CANCEL = 'io.novafoundation.omni.mst_cancelled',
}

export type MstParams = {
  salt: string;
  senderAddress: string;
  chainId: HexString;
  callHash: HexString;
  callData?: HexString;
  extrinsicHash?: HexString;
  description?: string;
};

type EventPayload = {
  eventId: string;
  roomId: string;
  sender: string;
  client: string;
  roomName?: string;
  date: Date;
};

export type InvitePayload = EventPayload & {
  content: OmniExtras;
  type: EventType.RoomMember;
};

export type MSTPayload = EventPayload & {
  content: MstParams;
  type: OmniMstEvents;
};

export type CombinedEventPayload = InvitePayload | MSTPayload;

type GeneralCallbacks = {
  onSyncEnd: () => void;
  onSyncProgress: () => void;
  onInvite: (data: InvitePayload) => void;
  // TODO: change message type in future
  onMessage: (message: string) => void;
};

export type MSTCallbacks = {
  onMstEvent: (data: MSTPayload) => void;
};

export type Callbacks = GeneralCallbacks & MSTCallbacks;
