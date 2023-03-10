import { EventType, MatrixEvent, Room } from 'matrix-js-sdk';

import { HexString } from '@renderer/domain/shared-kernel';

// =====================================================
// ============ ISecureMessenger interface =============
// =====================================================

export interface ISecureMessenger {
  // Init
  setHomeserver: (domain: string) => Promise<void | never>;
  loginFlows: () => Promise<LoginFlow[] | never>;
  skipLogin: (value: boolean) => void;
  loginWithCreds: (login: string, password: string) => Promise<void | never>;
  loginFromCache: () => Promise<void | never>;
  logout: () => Promise<void | never>;
  // registration: (login: string, password: string) => Promise<void | never>;
  stopClient: () => void;

  // Actions
  startRoomCreation: (mstAccountAddress: string) => Promise<RoomSignature | never>;
  finishRoomCreation: (params: RoomParams) => Promise<void | never>;
  cancelRoomCreation: (roomId: string) => Promise<void | never>;
  joinRoom: (roomId: string) => Promise<void | never>;
  leaveRoom: (roomId: string) => Promise<void | never>;
  invite: (roomId: string, signatoryId: string) => Promise<void | never>;
  listOfOmniRooms: (type: Membership.INVITE | Membership.JOIN) => Room[];
  setActiveRoom: (roomId: string) => void;
  readTimeline: () => Promise<MSTPayload[] | never>;
  sendMessage: (message: string) => void;
  markAsRead: (event: MatrixEvent) => Promise<void | never>;
  setupSubscribers: (handlers: Callbacks) => void;
  // checkUserExists: (userId: string) => Promise<boolean>;

  // Verification
  verifyWithKey: (securityKey: string) => Promise<boolean | never>;
  verifyWithFile: (securityFile: File) => Promise<boolean | never>;
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
  // Actions
  getCredentials: (key: keyof Credential, value: any) => Credential | undefined;
  saveCredentials: (credential: Credential) => void;
  updateCredentials: (userId: string, credential: Partial<Credential>) => void;

  getSkipLogin: () => SkipLogin;
  saveSkipLogin: (data: SkipLogin) => void;

  clear: () => void;
}

// =====================================================
// ============= ISecretStorage interface ==============
// =====================================================

export interface ISecretStorage {
  // Actions
  storePrivateKey: (keyId: string, privateKey: Uint8Array | unknown) => void | never;
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

export type LoginFlow = 'password' | 'sso' | 'cas';

// =====================================================
// ============== MST Events / Callbacks ===============
// =====================================================

export enum OmniMstEvent {
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
  type: OmniMstEvent;
};

export type CombinedEventPayload = InvitePayload | MSTPayload;

type GeneralCallbacks = {
  onSyncEnd: () => void;
  onSyncProgress: () => void;
  onInvite: (data: InvitePayload) => void;
  // TODO: change message type in future
  onMessage: (message: string) => void;
  onOnLogout: () => void;
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
