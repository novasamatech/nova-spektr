import { EventType, MatrixEvent, Room } from 'matrix-js-sdk';

import { HexString } from '@renderer/domain/types';

// =====================================================
// ============ SecureMessenger interface ==============
// =====================================================

export interface ISecureMessenger {
  // Init
  init: () => Promise<void | ErrorObject>;
  setHomeserver: (url: string) => Promise<void | ErrorObject>;
  skipLogin: (value: boolean) => void;
  loginWithCreds: (login: string, password: string) => Promise<void | ErrorObject>;
  loginFromCache: () => Promise<void | ErrorObject>;
  logout: () => Promise<void | ErrorObject>;
  // registration: (login: string, password: string) => Promise<void | ErrorObject>;
  stopClient: (shutdown?: boolean) => void;

  // Actions
  startRoomCreation: (mstAccountAddress: string) => Promise<RoomSignature | ErrorObject>;
  finishRoomCreation: (params: RoomParams) => Promise<void | ErrorObject>;
  cancelRoomCreation: (roomId: string) => Promise<void | ErrorObject>;
  joinRoom: (roomId: string) => Promise<void | ErrorObject>;
  leaveRoom: (roomId: string) => Promise<void | ErrorObject>;
  invite: (roomId: string, signatoryId: string) => Promise<void | ErrorObject>;
  listOfOmniRooms: (type: Membership.INVITE | Membership.JOIN) => Room[];
  setRoom: (roomId: string) => void;
  readTimeline: () => Promise<MSTPayload[] | ErrorObject>;
  sendMessage: (message: string) => void;
  markAsRead: (event: MatrixEvent) => Promise<void | ErrorObject>;
  setupSubscribers: (handlers: Callbacks) => void;
  clearSubscribers: () => void;
  // checkUserExists: (userId: string) => Promise<boolean>;

  // Verification
  verifyWithKey: (securityKey: string) => Promise<boolean | ErrorObject>;
  verifyWithPhrase: (securityPhrase: string) => Promise<boolean | ErrorObject>;

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
// =========== ICredentialStorage interface ============
// =====================================================

export type Credential = {
  userId: string;
  username: string;
  deviceId: string;
  accessToken: string;
  baseUrl: string;
  isLastLogin: boolean;
};

export type SkipLogin = {
  skip: boolean;
};

export interface ICredentialStorage {
  getCreds: (key: keyof Credential, value: any) => Credential | undefined;
  addCreds: (credential: Credential) => void;
  updateCreds: (userId: string, credential: Partial<Credential>) => void;

  getSkip: () => SkipLogin;
  setSkip: (data: SkipLogin) => void;

  clear: () => void;
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

// =====================================================
// ===================== Errors ========================
// =====================================================

export const enum Errors {
  ENCRYPTION_STARTED,
  ENCRYPTION_NOT_STARTED,
  IS_LOGGED_IN,
  NOT_LOGGED_IN,
  OLM_FAILED,
  WRONG_HOMESERVER,
  REGISTRATION,
  KEY_VERIFICATION,
  PHRASE_VERIFICATION,
  LOGOUT,
  LOGIN_CREDS,
  LOGIN_CACHE,
  NO_CREDS_IN_DB,
  START_ROOM,
  FINISH_ROOM,
  LEAVE_ROOM,
  JOIN_ROOM,
  INVITE_IN_ROOM,
  JOINED_ROOMS,
  MESSAGE,
  MARK_AS_READ,
  MST_INIT,
  MST_APPROVE,
  MST_FINAL_APPROVE,
  MST_CANCEL,
  ROOM_ENCRYPTION,
  ROOM_TOPIC,
  OUTSIDE_ROOM,
  INVITE_USERS,
  MASS_VERIFY,
  READ_TIMELINE,
}

export type ErrorObject = {
  code: Errors;
  message: string;
};
