import { EventType, MatrixEvent, Room } from 'matrix-js-sdk';

import { HexString, PublicKey, AccountID } from '@renderer/domain/shared-kernel';

// =====================================================
// ============ ISecureMessenger interface =============
// =====================================================

export interface ISecureMessenger {
  // Init
  setHomeserver: (domain: string) => Promise<void>;
  loginFlows: () => Promise<LoginFlow[]>;
  loginWithCreds: (login: string, password: string) => Promise<void>;
  loginFromCache: () => Promise<void>;
  logout: () => Promise<void>;
  // registration: (login: string, password: string) => Promise<void>;
  stopClient: () => void;

  // Actions
  createRoom: (params: RoomParams) => Promise<void>;
  joinRoom: (roomId: string) => Promise<void>;
  leaveRoom: (roomId: string) => Promise<void>;
  invite: (roomId: string, signatoryId: string) => Promise<void>;
  listOfSpektrRooms: (type: Membership.INVITE | Membership.JOIN) => Room[];
  readTimeline: () => Promise<MSTPayload[]>;
  sendMessage: (roomId: string, message: string) => void;
  markAsRead: (event: MatrixEvent) => Promise<void>;
  setEventCallbacks: (callbacks: Callbacks) => void;
  // checkUserExists: (userId: string) => Promise<boolean>;

  // Verification
  verifyWithKey: (securityKey: string) => Promise<boolean>;
  verifyWithFile: (securityFile: File) => Promise<boolean>;
  verifyWithPhrase: (securityPhrase: string) => Promise<boolean>;

  // MST operations
  mstInitiate: (roomId: string, params: MstParams) => void;
  mstApprove: (roomId: string, params: MstParams) => void;
  mstFinalApprove: (roomId: string, params: MstParams) => void;
  mstCancel: (roomId: string, params: MstParams) => void;

  // Properties
  userId: string | undefined;
  userIsVerified: boolean;
  sessionKey: string | undefined;
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

export interface ICredentialStorage {
  // Actions
  getCredentials: (key: keyof Credential, value: any) => Credential | undefined;
  saveCredentials: (credential: Credential) => void;
  updateCredentials: (userId: string, credential: Partial<Credential>) => void;
  clear: () => void;
}

// =====================================================
// ============= ISecretStorage interface ==============
// =====================================================

export interface ISecretStorage {
  // Actions
  storePrivateKey: (keyId: string, privateKey: Uint8Array | unknown) => void;
  hasPrivateKey: (keyId: string) => boolean;
  getPrivateKey: (keyId: string) => Uint8Array | undefined;
  deletePrivateKey: (keyId: string) => void;
  clearSecretStorageKeys: () => void;

  // Properties
  cryptoCallbacks: {
    getSecretStorageKey: (value: { keys: Record<string, any> }) => Promise<[string, Uint8Array] | null>;
    cacheSecretStorageKey: (keyId: string, keyInfo: any, privateKey: Uint8Array) => void;
  };
}

// =====================================================
// ======================= General =====================
// =====================================================

export const enum Membership {
  INVITE = 'invite',
  JOIN = 'join',
  LEAVE = 'leave',
}

export type RoomParams = {
  accountName: string;
  accountId: AccountID;
  inviterPublicKey: PublicKey;
  threshold: number;
  signatories: {
    accountId: AccountID;
    matrixId?: string;
  }[];
};

export type SpektrExtras = {
  mst_account: {
    accountName: string;
    threshold: number;
    signatories: AccountID[];
    address: AccountID;
    inviterPublicKey: PublicKey;
  };
};

export type LoginFlow = 'password' | 'sso' | 'cas';

// =====================================================
// ============== MST Events / Callbacks ===============
// =====================================================

export enum SpektrMstEvent {
  INIT = 'io.novafoundation.spektr.mst_initiated',
  APPROVE = 'io.novafoundation.spektr.mst_approved',
  FINAL_APPROVE = 'io.novafoundation.spektr.mst_executed',
  CANCEL = 'io.novafoundation.spektr.mst_cancelled',
}

export type MstParams = {
  salt: string;
  senderAddress: AccountID;
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
  content: SpektrExtras;
  type: EventType.RoomMember;
};

export type MSTPayload = EventPayload & {
  content: MstParams;
  type: SpektrMstEvent;
};

export type CombinedEventPayload = InvitePayload | MSTPayload;

type GeneralCallbacks = {
  onSyncEnd: () => void;
  onSyncProgress: () => void;
  onInvite: (data: InvitePayload) => void;
  // TODO: change message type in future
  onMessage: (message: string) => void;
  onLogout: () => void;
};

export type MSTCallbacks = {
  onMstEvent: (data: MSTPayload) => void;
};

export type Callbacks = GeneralCallbacks & MSTCallbacks;

// =====================================================
// ===================== Errors ========================
// =====================================================

export const enum MatrixError {
  ENCRYPTION_STARTED,
  ENCRYPTION_NOT_STARTED,
  IS_LOGGED_IN,
  NOT_LOGGED_IN,
  OLM_FAILED,
  WRONG_HOMESERVER,
  REGISTRATION,
  KEY_VERIFICATION,
  FILE_VERIFICATION,
  PHRASE_VERIFICATION,
  LOGOUT,
  LOGIN_CREDS,
  LOGIN_FLOWS,
  LOGIN_CACHE,
  INIT_WITH_CREDENTIALS,
  NO_CREDS_IN_DB,
  CREATE_ROOM,
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
  MEMBERS_VERIFICATION,
  READ_TIMELINE,
  CREATE_MATRIX_CLIENT,
  VERIFY_FILE_MAX_SIZE,
  READ_VERIFY_FILE,
  VERIFY_FILE_BAD_CONTENT,
}

export type ErrorObject = {
  code: MatrixError;
  message: string;
};
