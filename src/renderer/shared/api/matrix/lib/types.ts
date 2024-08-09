import { type EventType, type MatrixEvent, type Room } from 'matrix-js-sdk';

import {
  type AccountId,
  type CallData,
  type CallHash,
  type ChainId,
  type CryptoType,
  type HexString,
  type MultisigThreshold,
  type MultisigTxStatus,
  type Timepoint,
} from '@shared/core';

// =====================================================
// ============ ISecureMessenger interface =============
// =====================================================

export interface ISecureMessenger {
  // Init
  setHomeserver: (domain: string) => Promise<void>;
  loginFlows: () => Promise<LoginFlows>;
  getSsoLoginUrl: (baseUrl: string, type: string, id: string) => string;
  loginWithSso: (token: string) => Promise<void>;
  loginWithCreds: (login: string, password: string) => Promise<void>;
  loginFromCache: () => Promise<void>;
  logout: () => Promise<void>;
  // registration: (login: string, password: string) => Promise<void>;
  stopClient: () => void;

  // Actions
  createRoom: (params: RoomParams) => Promise<string>;
  joinRoom: (roomId: string) => Promise<void>;
  leaveRoom: (roomId: string) => Promise<void>;
  invite: (roomId: string, signatoryId: string) => Promise<void>;
  joinedRooms: (accountId?: string) => Room[];
  sendMessage: (roomId: string, message: string) => Promise<string>;
  markAsRead: (readEventId: string, events: MatrixEvent[]) => Promise<void>;
  setEventCallbacks: (callbacks: Callbacks) => void;
  syncSpektrTimeline: () => Promise<void>;

  // Verification
  verifyWithKey: (securityKey: string) => Promise<boolean>;
  verifyWithFile: (securityFile: File) => Promise<boolean>;
  verifyWithPhrase: (securityPhrase: string) => Promise<boolean>;

  // Multisig operations
  sendUpdate: (roomId: string, params: UpdatePayload) => Promise<void>;
  sendApprove: (roomId: string, params: ApprovePayload) => Promise<void>;
  sendFinalApprove: (roomId: string, params: FinalApprovePayload) => Promise<void>;
  sendCancel: (roomId: string, params: CancelPayload) => Promise<void>;

  // Multisig event checkers
  isUpdateEvent: (type: SpektrMultisigEvent, content?: BaseMultisigPayload) => content is UpdatePayload;
  isApproveEvent: (type: SpektrMultisigEvent, content?: BaseMultisigPayload) => content is ApprovePayload;
  isFinalApproveEvent: (type: SpektrMultisigEvent, content?: BaseMultisigPayload) => content is FinalApprovePayload;
  isCancelEvent: (type: SpektrMultisigEvent, content?: BaseMultisigPayload) => content is CancelPayload;

  // Properties
  userId: string | undefined;
  sessionIsVerified: boolean;
  userIsLoggedIn: boolean;
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
  accountId: AccountId;
  creatorAccountId: AccountId;
  threshold: MultisigThreshold;
  cryptoType: CryptoType;
  chainId?: ChainId;
  signatories: {
    accountId: AccountId;
    matrixId?: string;
  }[];
};

export type SpektrExtras = {
  mstAccount: {
    accountName: string;
    threshold: MultisigThreshold;
    signatories: AccountId[];
    accountId: AccountId;
    creatorAccountId: AccountId;
    cryptoType: CryptoType;
    chainId?: ChainId;
  };
};

export type LoginFlows = {
  token: boolean;
  password: boolean;
  sso: {
    id: string;
    name: string;
    brand: string;
  }[];
};

// =====================================================
// ============== MST Events / Callbacks ===============
// =====================================================

export const enum SpektrMultisigEvent {
  UPDATE = 'io.novafoundation.spektr.mst_updated',
  APPROVE = 'io.novafoundation.spektr.mst_approved',
  FINAL_APPROVE = 'io.novafoundation.spektr.mst_executed',
  CANCEL = 'io.novafoundation.spektr.mst_cancelled',
}

export interface BaseMultisigPayload {
  chainId: ChainId;
  callHash: CallHash;
  callData?: CallData;
  senderAccountId: AccountId;
  description?: string;
  callTimepoint: Timepoint;
}

export interface ApprovePayload extends BaseMultisigPayload {
  extrinsicHash?: HexString;
  extrinsicTimepoint: Timepoint;
  error: boolean;
}

export interface FinalApprovePayload extends ApprovePayload {
  callOutcome: MultisigTxStatus;
}

export type CancelPayload = ApprovePayload;

export type UpdatePayload = BaseMultisigPayload;

type MatrixEventPayload = {
  eventId: string;
  roomId: string;
  sender: string;
  client: string;
  roomName?: string;
  date: Date;
};

export type InvitePayload = MatrixEventPayload & {
  content: SpektrExtras;
  type: EventType.RoomMember;
};

export type MultisigPayload = MatrixEventPayload & {
  content: ApprovePayload | FinalApprovePayload | CancelPayload | UpdatePayload;
  type: SpektrMultisigEvent;
};

type GeneralCallbacks = {
  onSyncEnd: () => void;
  onInvite: (data: InvitePayload) => void;
  // onMessage: (message: string) => void;
  onLogout: () => void;
};

export type MultisigCallbacks = {
  onMultisigEvent: (payload: MultisigPayload, extras: SpektrExtras | undefined) => Promise<void>;
};

export type Callbacks = GeneralCallbacks & MultisigCallbacks;

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
  INIT_WITH_SSO,
  NO_CREDS_IN_DB,
  CREATE_ROOM,
  LEAVE_ROOM,
  JOIN_ROOM,
  INVITE_IN_ROOM,
  JOINED_ROOMS,
  MESSAGE,
  MARK_AS_READ,
  MST_UPDATE,
  MST_APPROVE,
  MST_FINAL_APPROVE,
  MST_CANCEL,
  ROOM_ENCRYPTION,
  ROOM_TOPIC,
  OUTSIDE_ROOM,
  INVITE_USERS,
  MEMBERS_VERIFICATION,
  CREATE_MATRIX_CLIENT,
  VERIFY_FILE_MAX_SIZE,
  READ_VERIFY_FILE,
  VERIFY_FILE_BAD_CONTENT,
  TIMELINE_PAGINATION,
}

export type ErrorObject = {
  code: MatrixError;
  message: string;
};
