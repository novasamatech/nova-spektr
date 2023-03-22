import Olm from '@matrix-org/olm';
import {
  ClientEvent,
  createClient,
  Direction,
  EventType,
  IndexedDBCryptoStore,
  IndexedDBStore,
  MatrixClient,
  MatrixEvent,
  MatrixEventEvent,
  Preset,
  Room,
  RoomEvent,
  RoomMemberEvent,
  Visibility,
  AutoDiscovery,
  AuthType,
} from 'matrix-js-sdk';
import { ISecretStorageKeyInfo } from 'matrix-js-sdk/lib/crypto/api';
import { deriveKey } from 'matrix-js-sdk/lib/crypto/key_passphrase';
import { IStore } from 'matrix-js-sdk/lib/store';
import { SyncState } from 'matrix-js-sdk/lib/sync';
import { logger } from 'matrix-js-sdk/lib/logger';
import noop from 'lodash/noop';

import {
  BASE_MATRIX_URL,
  KEY_FILE_MAX_SIZE,
  MST_EVENTS,
  ROOM_CRYPTO_CONFIG,
  WELL_KNOWN_SERVERS,
} from './common/constants';
import MATRIX_ERRORS from './common/errors';
import {
  Callbacks,
  Credential,
  ErrorObject,
  MatrixError,
  ICredentialStorage,
  InvitePayload,
  ISecretStorage,
  ISecureMessenger,
  Membership,
  MstParams,
  MSTPayload,
  SpektrExtras,
  SpektrMstEvent,
  RoomParams,
  LoginFlow,
} from './common/types';
import CredentialStorage from './credentialStorage';
import SecretStorage from './secretStorage';
import { nonNullable } from '@renderer/shared/utils/functions';
import { getShortAddress } from '@renderer/shared/utils/strings';

global.Olm = Olm;
logger.disableAll();

export class Matrix implements ISecureMessenger {
  private matrixClient: MatrixClient;
  private eventCallbacks: Callbacks;
  private credentialStorage: ICredentialStorage;
  private secretStorage: ISecretStorage;

  constructor() {
    this.eventCallbacks = {
      onSyncEnd: noop,
      onSyncProgress: noop,
      onInvite: noop,
      onMessage: noop,
      onLogout: noop,
      onMstEvent: noop,
    };
    this.credentialStorage = new CredentialStorage();
    this.secretStorage = new SecretStorage();
    this.matrixClient = createClient({ baseUrl: BASE_MATRIX_URL });
  }

  // =====================================================
  // ================= Public methods ====================
  // =====================================================

  /**
   * Set homeserver with new base url
   * @param domain homeserver domain
   */
  async setHomeserver(domain: string): Promise<void> {
    const wellKnown = WELL_KNOWN_SERVERS.find((server) => server.domain === domain);

    if (wellKnown) {
      try {
        const config = { 'm.homeserver': { base_url: wellKnown.url } };
        await AutoDiscovery.fromDiscoveryConfig(config);
        this.createTempClient(wellKnown.url);

        return;
      } catch (error) {
        throw this.createError(MatrixError.WRONG_HOMESERVER, error);
      }
    }

    let discoveryResult;
    try {
      discoveryResult = await AutoDiscovery.findClientConfig(domain);
    } catch (error) {
      throw this.createError(MatrixError.WRONG_HOMESERVER, error);
    }

    if (discoveryResult['m.homeserver']?.error || !discoveryResult['m.homeserver']?.base_url) {
      throw this.createError(MatrixError.WRONG_HOMESERVER);
    }

    this.createTempClient(discoveryResult['m.homeserver'].base_url);
  }

  // HINT: redirect to external login form (example: "saml" for mozilla.com)
  // async function startSsoLogin(baseUrl, type, idpId) {
  //   const client = createTemporaryClient(baseUrl);
  //   window.location.href = client.getSsoLoginUrl(window.location.href, type, idpId);
  // }

  /**
   * Get available login flows
   */
  async loginFlows(): Promise<LoginFlow[]> {
    try {
      const { flows } = await this.matrixClient.loginFlows();

      // TODO: return more data in future
      return flows.map((flow: any) => flow.type.replace('m.login.', '')) as LoginFlow[];
    } catch (error) {
      throw this.createError(MatrixError.LOGIN_FLOWS, error);
    }
  }

  /**
   * Login user to Matrix with credentials
   * @param login login value
   * @param password password value
   * @return {Promise}
   */
  async loginWithCreds(login: string, password: string): Promise<void> {
    try {
      await this.initClientWithCreds(login, password);
      await this.matrixClient.initCrypto();
      await this.matrixClient.startClient({ lazyLoadMembers: true });
      this.matrixClient.setGlobalErrorOnUnknownDevices(false);
      this.subscribeToEvents();
    } catch (error) {
      throw this.createError(MatrixError.LOGIN_CREDS, error);
    }
  }

  /**
   * Login user to Matrix with cached credentials
   * @return {Promise}
   */
  async loginFromCache(): Promise<void> {
    try {
      await this.initClientFromCache();
      await this.matrixClient.initCrypto();
      await this.matrixClient.startClient({ lazyLoadMembers: true });
      this.matrixClient.setGlobalErrorOnUnknownDevices(false);
      this.subscribeToEvents();
    } catch (error) {
      throw this.createError(MatrixError.LOGIN_CACHE, error);
    }
  }

  /**
   * Register user in Matrix
   * @param login login value
   * @param password password value
   * @return {Promise}
   */
  // async registration(login: string, password: string): Promise<void> {
  //   try {
  //     const auth = { type: 'm.login.spektr_matrix_protocol' };
  //     const data = await this.matrixClient.register(login, password, null, auth, {
  //       email: false,
  //     });
  //     console.log(data);
  //   } catch (error) {
  //     throw this.createError(Errors.REGISTRATION, error);
  //   }
  // }

  /**
   * Verify user with Cross signing security key
   * @param securityKey secret user's key
   * @return {Promise}
   */
  async verifyWithKey(securityKey: string): Promise<boolean> {
    try {
      const mx = this.matrixClient;
      const defaultStorageKey = mx.getAccountData('m.secret_storage.default_key')?.getContent().key;
      const storageKeyInfo = mx
        .getAccountData(`m.secret_storage.key.${defaultStorageKey}`)
        ?.getContent<ISecretStorageKeyInfo>();
      if (!storageKeyInfo) return false;

      const privateKey = mx.keyBackupKeyFromRecoveryKey(securityKey);
      const isCorrect = await mx.checkSecretStorageKey(privateKey, storageKeyInfo);
      if (isCorrect) {
        this.secretStorage.storePrivateKey(defaultStorageKey, privateKey);
        await mx.checkOwnCrossSigningTrust();
      }

      return isCorrect;
    } catch (error) {
      throw this.createError(MatrixError.KEY_VERIFICATION, error);
    }
  }

  /**
   * Verify user with Cross signing security file
   * @param securityFile secret user's file
   * @return {Promise}
   */
  async verifyWithFile(securityFile: File): Promise<boolean> {
    if (securityFile.size > KEY_FILE_MAX_SIZE) {
      throw this.createError(MatrixError.VERIFY_FILE_MAX_SIZE);
    }

    let securityKey = '';
    try {
      const fileKey = await securityFile.text();
      securityKey = fileKey.replace(/(\r\n|\n|\r)/gm, ' ');
    } catch (error) {
      throw this.createError(MatrixError.VERIFY_FILE_MAX_SIZE, error);
    }

    // test it's within the base58 alphabet
    if (!/^[1-9A-Za-z\s]+$/.test(securityKey)) {
      throw this.createError(MatrixError.VERIFY_FILE_BAD_CONTENT);
    }

    try {
      return this.verifyWithKey(securityKey);
    } catch (error) {
      throw this.createError(MatrixError.FILE_VERIFICATION, error);
    }
  }

  /**
   * Verify user with Cross signing security phrase
   * @param securityPhrase secret user's phrase
   * @return {Promise}
   */
  async verifyWithPhrase(securityPhrase: string): Promise<boolean> {
    try {
      const mx = this.matrixClient;

      const defaultStorageKey = mx.getAccountData('m.secret_storage.default_key')?.getContent().key;
      const storageKeyInfo = mx
        .getAccountData(`m.secret_storage.key.${defaultStorageKey}`)
        ?.getContent<ISecretStorageKeyInfo>();
      if (!storageKeyInfo) return false;

      const { salt, iterations } = storageKeyInfo.passphrase || {};
      const privateKey = await deriveKey(securityPhrase, salt, iterations);
      const isCorrect = await mx.checkSecretStorageKey(privateKey, storageKeyInfo);
      if (isCorrect) {
        this.secretStorage.storePrivateKey(defaultStorageKey, privateKey);
        await mx.checkOwnCrossSigningTrust();
      }

      return isCorrect;
    } catch (error) {
      throw this.createError(MatrixError.PHRASE_VERIFICATION, error);
    }
  }

  /**
   * Stop the client and remove handlers
   */
  stopClient() {
    this.matrixClient.stopClient();
    this.matrixClient.removeAllListeners();
  }

  /**
   * Logout user from Matrix and clean storages
   * @return {Promise}
   */
  async logout(): Promise<void> {
    const credentials = this.credentialStorage.getCredentials('userId', this.userId);
    if (!credentials) {
      throw this.createError(MatrixError.LOGOUT);
    }
    this.credentialStorage.updateCredentials(credentials.userId, { isLastLogin: false });

    try {
      this.stopClient();
      await this.matrixClient.logout();
      await this.matrixClient.clearStores();
      this.eventCallbacks.onLogout();
      this.credentialStorage.clear();
    } catch (error) {
      throw this.createError(MatrixError.LOGOUT, error);
    }
  }

  /**
   * Create new room for MST account
   * @param params room configuration
   * @return {Promise}
   */
  async createRoom(params: RoomParams): Promise<void> {
    try {
      const { room_id: roomId } = await this.matrixClient.createRoom({
        name: `Nova Spektr MST | ${getShortAddress(params.accountId)}`,
        visibility: Visibility.Private,
        preset: Preset.TrustedPrivateChat,
      });

      const matrixIds = params.signatories.map((s) => s.matrixId).filter(nonNullable);

      await this.initStateEvents(roomId, params);
      await this.inviteSignatories(roomId, matrixIds);
      await this.verifyDevices(matrixIds);
    } catch (error) {
      throw this.createError(MatrixError.CREATE_ROOM, error);
    }
  }

  /**
   * Leave MST room
   * @param roomId room's identifier
   * @return {Promise}
   */
  async leaveRoom(roomId: string): Promise<void> {
    try {
      await this.matrixClient.leave(roomId);
    } catch (error) {
      throw this.createError(MatrixError.LEAVE_ROOM, error);
    }
  }

  /**
   * Join existing MST room, skips if already joined
   * @param roomId room's identifier
   * @return {Promise}
   */
  async joinRoom(roomId: string): Promise<void> {
    try {
      await this.matrixClient.joinRoom(roomId);
    } catch (error) {
      throw this.createError(MatrixError.JOIN_ROOM, error);
    }
  }

  /**
   * Invite signatory to exist MST room
   * @param roomId room's identifier
   * @param signatoryId signatory's identifier
   * @return {Promise}
   */
  async invite(roomId: string, signatoryId: string): Promise<void> {
    try {
      await this.matrixClient.invite(roomId, signatoryId);
    } catch (error) {
      throw this.createError(MatrixError.INVITE_IN_ROOM, error);
    }
  }

  /**
   * List of available Nova Spektr rooms
   * @param type which rooms to get Invite/Join
   * @return {Array}
   */
  listOfSpektrRooms(type: Membership.INVITE | Membership.JOIN): Room[] {
    return this.matrixClient.getRooms().filter((room) => {
      return this.isSpektrRoom(room.name) && room.getMyMembership() === type;
    });
  }

  /**
   * Get live timeline events for all rooms
   * @return {Array}
   */
  async readTimeline(): Promise<MSTPayload[]> {
    let rooms;
    try {
      const data = await this.matrixClient.getJoinedRooms();
      rooms = data.joined_rooms || [];
    } catch (error) {
      throw this.createError(MatrixError.JOINED_ROOMS, error);
    }

    const timeline = rooms.reduce<MatrixEvent[]>((acc, roomId) => {
      const room = this.matrixClient.getRoom(roomId);
      if (!room || !this.isSpektrRoom(room.name)) return acc;

      const roomTimeline = room
        .getLiveTimeline()
        .getEvents()
        .filter((event) => this.isSpektrMstEvent(event) && event.getSender() !== this.userId);

      if (roomTimeline.length > 0) {
        acc.push(...roomTimeline);
      }

      return acc;
    }, []);

    try {
      await Promise.all(timeline.map(this.markAsRead));
    } catch (error) {
      throw this.createError(MatrixError.READ_TIMELINE, error);
    }

    return timeline.map((event) => this.createEventPayload<MSTPayload>(event));
  }

  /**
   * Send message to active room
   * @param roomId room's identifier
   * @param message sending message
   * @return {Promise}
   */
  async sendMessage(roomId: string, message: string): Promise<void> {
    try {
      await this.matrixClient.sendTextMessage(roomId, message);
    } catch (error) {
      throw this.createError(MatrixError.MESSAGE, error);
    }
  }

  /**
   * Mark event as read
   * @param event Matrix event that must be marked as read
   * @return {Promise}
   */
  async markAsRead(event: MatrixEvent): Promise<void> {
    try {
      await this.matrixClient.sendReadReceipt(event);
    } catch (error) {
      throw this.createError(MatrixError.MARK_AS_READ, error);
    }
  }

  /**
   * Set callbacks for Matrix events
   * @param handlers aggregated callback handlers
   */
  setEventCallbacks(handlers: Callbacks) {
    this.eventCallbacks = handlers;
  }

  /**
   * Check does User already exist
   * @param userId matrix identifier
   * @return {Promise}
   */
  // async checkUserExists(userId: string): Promise<boolean> {
  //   if (!this.matrixClient) {
  //     throw this.createError('Client is not active');
  //   }
  //
  //   const username = userId.match(MatrixUserNameRegex);
  //   if (!username) {
  //     throw new Error('User ID can only contain characters a-z, 0-9, or =_-./');
  //   }
  //
  //   try {
  //     return await this.matrixClient.isUsernameAvailable(username?.[1]);
  //   } catch (error) {
  //     throw this.createError((error as Error).message, error);
  //   }
  // }

  /**
   * Send MST_INIT state event to the room
   * Initialize multi-sig transaction
   * @param roomId room's identifier
   * @param params MST parameters
   * @return {Promise}
   */
  async mstInitiate(roomId: string, params: MstParams): Promise<void> {
    try {
      await this.matrixClient.sendEvent(roomId, SpektrMstEvent.INIT, params);
    } catch (error) {
      throw this.createError(MatrixError.MST_INIT, error);
    }
  }

  /**
   * Send MST_APPROVE state event to the room
   * Approve multi-sig transaction
   * @param roomId room's identifier
   * @param params MST parameters
   * @return {Promise}
   */
  async mstApprove(roomId: string, params: MstParams): Promise<void> {
    try {
      await this.matrixClient.sendEvent(roomId, SpektrMstEvent.APPROVE, params);
    } catch (error) {
      throw this.createError(MatrixError.MST_APPROVE, error);
    }
  }

  /**
   * Send MST_FINAL_APPROVE state event to the room
   * Final approve for multi-sig transaction
   * @param roomId room's identifier
   * @param params MST parameters
   * @return {Promise}
   */
  async mstFinalApprove(roomId: string, params: MstParams): Promise<void> {
    try {
      await this.matrixClient.sendEvent(roomId, SpektrMstEvent.FINAL_APPROVE, params);
    } catch (error) {
      throw this.createError(MatrixError.MST_FINAL_APPROVE, error);
    }
  }

  /**
   * Send MST_CANCEL state event to the room
   * Cancel multi-sig transaction
   * @param roomId room's identifier
   * @param params MST parameters
   * @return {Promise}
   */
  async mstCancel(roomId: string, params: MstParams): Promise<void> {
    try {
      await this.matrixClient.sendEvent(roomId, SpektrMstEvent.CANCEL, params);
    } catch (error) {
      throw this.createError(MatrixError.MST_CANCEL, error);
    }
  }

  // =====================================================
  // ====================== Getters ======================
  // =====================================================

  /**
   * Get matrix userId
   * @return {String | null}
   */
  get userId(): string | undefined {
    return this.matrixClient.getUserId() || undefined;
  }

  /**
   * Is Matrix user logged in
   * @return {Boolean}
   */
  get userIsLoggedIn(): boolean {
    return this.matrixClient.isLoggedIn();
  }

  /**
   * Get device session key
   * @return {String | null}
   */
  get sessionKey(): string | undefined {
    return this.matrixClient.getDeviceEd25519Key() || undefined;
  }

  /**
   * Get current device cross sign verification status
   * @return {Boolean}
   */
  get userIsVerified(): boolean {
    if (!this.userId) return false;

    const mx = this.matrixClient;
    const crossSignInfo = mx.getStoredCrossSigningForUser(this.userId);
    const deviceId = mx.getDeviceId();
    if (!deviceId || !crossSignInfo) return false;

    const deviceInfo = mx.getStoredDevice(this.userId, deviceId);
    if (!deviceInfo) return false;

    const deviceTrust = crossSignInfo.checkDeviceTrust(crossSignInfo, deviceInfo, false, true);

    return deviceTrust.isCrossSigningVerified();
  }

  // =====================================================
  // ================= Private methods ===================
  // =====================================================

  /**
   * Send encryption and topic events
   * @param roomId Matrix room ID
   * @param params room parameters
   * @return {Promise}
   */
  private async initStateEvents(roomId: string, params: RoomParams): Promise<void> {
    try {
      await this.matrixClient.sendStateEvent(roomId, EventType.RoomEncryption, ROOM_CRYPTO_CONFIG);
    } catch (error) {
      throw this.createError(MatrixError.ROOM_ENCRYPTION, error);
    }

    try {
      const payload: SpektrExtras = {
        mst_account: {
          accountName: params.accountName,
          threshold: params.threshold,
          signatories: params.signatories.map((s) => s.accountId),
          address: params.accountId,
          inviterPublicKey: params.inviterPublicKey,
        },
      };
      await this.matrixClient.sendStateEvent(roomId, 'm.room.topic', {
        topic: `Room for communications for ${getShortAddress(params.accountId)} MST account`,
        spektr_extras: payload,
      });
    } catch (error) {
      throw this.createError(MatrixError.ROOM_TOPIC, error);
    }
  }

  /**
   * Invite signatories to Matrix room
   * @param roomId Matrix room ID
   * @param matrixIds list of signatories' matrix ids
   * @return {Promise}
   */
  private async inviteSignatories(roomId: string, matrixIds: string[]): Promise<void> {
    try {
      const uniqueInvites = new Set(matrixIds.filter((matrixId) => matrixId !== this.userId));
      const inviteRequests = Array.from(uniqueInvites).map((matrixId) => {
        return this.matrixClient.invite(roomId, matrixId);
      });

      await Promise.all(inviteRequests);
    } catch (error) {
      throw this.createError(MatrixError.INVITE_USERS, error);
    }
  }

  /**
   * Verify Matrix devices
   * @param matrixIds array of Matrix ids
   * @return {Promise}
   */
  private async verifyDevices(matrixIds: string[]): Promise<void> {
    try {
      const memberKeys = await this.matrixClient.downloadKeys(matrixIds);

      const verifyRequests = matrixIds.map((matrixId) => {
        const keys = Object.keys(memberKeys[matrixId]);

        return keys.map((deviceId) => this.matrixClient.setDeviceVerified(matrixId, deviceId));
      });

      await Promise.all(verifyRequests.flat());
    } catch (error) {
      throw this.createError(MatrixError.MEMBERS_VERIFICATION, error);
    }
  }

  /**
   * Initiate Matrix client with user credentials
   * @param username user's login
   * @param password user's password
   * @return {Promise}
   */
  private async initClientWithCreds(username: string, password: string): Promise<void> {
    try {
      const credentials = this.credentialStorage.getCredentials('username', username);

      const userLoginResult = await this.matrixClient.login(AuthType.Password, {
        ...(credentials?.deviceId && { device_id: credentials.deviceId }),
        initial_device_display_name: process.env.PRODUCT_NAME,
        identifier: { type: 'm.id.user', user: username },
        password,
      });

      this.matrixClient = await this.createMatrixClient({
        baseUrl: this.matrixClient.baseUrl,
        userId: userLoginResult.user_id,
        accessToken: userLoginResult.access_token,
        deviceId: credentials?.deviceId || userLoginResult.device_id,
      });

      if (credentials) {
        this.credentialStorage.updateCredentials(credentials.userId, {
          accessToken: userLoginResult.access_token,
          isLastLogin: true,
        });
      } else {
        this.credentialStorage.saveCredentials({
          username,
          userId: userLoginResult.user_id,
          accessToken: userLoginResult.access_token,
          deviceId: userLoginResult.device_id,
          baseUrl: this.matrixClient.baseUrl,
          isLastLogin: true,
        });
      }
    } catch (error) {
      throw this.createError(MatrixError.INIT_WITH_CREDENTIALS, error);
    }
  }

  /**
   * Initiate Matrix client from storage (cache)
   * @return {Promise}
   */
  private async initClientFromCache(): Promise<void> {
    const credentials = this.credentialStorage.getCredentials('isLastLogin', true);

    if (!credentials) {
      throw this.createError(MatrixError.NO_CREDS_IN_DB);
    }

    this.matrixClient = await this.createMatrixClient({
      baseUrl: credentials.baseUrl,
      userId: credentials.userId,
      accessToken: credentials.accessToken,
      deviceId: credentials.deviceId,
    });
  }

  /**
   * Subscribe to Matrix events
   */
  private subscribeToEvents() {
    this.handleSyncEvent();
    this.handleInviteEvent();
    this.handleDecryptedEvents();
    this.handleSelfCustomEvents();
  }

  /**
   * Handle sync event
   */
  private handleSyncEvent() {
    this.matrixClient.on(ClientEvent.Sync, (state) => {
      if (state === SyncState.Syncing) {
        this.eventCallbacks.onSyncProgress();
      }
      if (state === SyncState.Prepared) {
        this.eventCallbacks.onSyncEnd();
      }
    });
  }

  /**
   * Handle invite event
   */
  private handleInviteEvent() {
    this.matrixClient.on(RoomMemberEvent.Membership, async (event, member) => {
      const roomId = event.getRoomId();
      const userIsSender = event.getSender() === this.userId;
      const userIsNotMember = member.userId !== this.userId;
      const eventIsNotInvite = member.membership !== Membership.INVITE;

      if (!roomId || userIsSender || userIsNotMember || eventIsNotInvite) return;

      try {
        // getRoomSummary loads room into client, otherwise room will be NULL
        const roomSummary = await this.matrixClient.getRoomSummary(roomId);
        const roomIsValid = this.isSpektrRoom(roomSummary.name);
        const room = this.matrixClient.getRoom(roomId);
        const topic = this.getSpektrTopic(room);
        const userHasJoined = room?.getMyMembership() === Membership.JOIN;
        if (!roomIsValid || !room || !topic || userHasJoined) return;

        console.info('🔸 Invite event - ', event.getSender(), member.membership, roomId);

        const payload = this.createEventPayload<InvitePayload>(event, {
          content: topic,
          roomName: room.name,
        });
        this.eventCallbacks.onInvite(payload);
      } catch (error) {
        console.info(`Room doesn't exist (inviter has left) - reject invite`);
        await this.leaveRoom(roomId);
      }
    });
  }

  /**
   * Handle decrypted events (MST and messages)
   */
  private handleDecryptedEvents() {
    this.matrixClient.on(MatrixEventEvent.Decrypted, async (event) => {
      let handler: any = () => {};
      if (this.isSpektrMstEvent(event)) {
        const payload = this.createEventPayload<MSTPayload>(event);
        handler = this.eventCallbacks.onMstEvent.bind(this, payload);
      }
      if (event.getType() === EventType.RoomMessage) {
        const payload = event.getContent().body;
        handler = this.eventCallbacks.onMessage.bind(this, payload);
      }

      const roomId = event.getRoomId();
      if (!roomId) return;

      const room = this.matrixClient.getRoom(roomId);
      if (!room || !this.isSpektrRoom(room.name)) return;

      handler();
    });
  }

  /**
   * Handle echo events (init, approve, final, cancel)
   */
  private handleSelfCustomEvents() {
    this.matrixClient.on(RoomEvent.LocalEchoUpdated, (event, room) => {
      if (event.getSender() !== this.userId || event.status !== 'sent') return;

      if (!this.isSpektrMstEvent(event) || !this.isSpektrRoom(room.name)) return;

      this.eventCallbacks.onMstEvent(this.createEventPayload<MSTPayload>(event));
    });
  }

  // =====================================================
  // ====================== Helpers ======================
  // =====================================================

  /**
   * Create error object
   * @param error error code and message
   * @param origin original error object
   * @return {ErrorObject}
   */
  private createError(error: MatrixError, origin?: unknown | MatrixError): ErrorObject {
    if (!origin) return MATRIX_ERRORS[error];

    if (origin instanceof Error) {
      console.warn(`🔶 Matrix original error object: ${origin} 🔶`);

      return MATRIX_ERRORS[error];
    }

    if ((origin as ErrorObject)?.code && (origin as ErrorObject)?.message) {
      return origin as ErrorObject;
    }

    return MATRIX_ERRORS[error];
  }

  /**
   * Create notification payload from Matrix Event
   * @param event matrix event object
   * @param params content and roomName
   * @return {Object}
   */
  private createEventPayload<T extends MSTPayload | InvitePayload>(
    event: MatrixEvent,
    params?: {
      content: SpektrExtras;
      roomName: string;
    },
  ): T {
    return {
      eventId: event.getId(),
      roomId: event.getRoomId(),
      sender: event.getSender(),
      client: this.matrixClient.getUserId(),
      date: event.getDate() || new Date(),
      type: event.getType(),
      content: params?.content || event.getContent(),
      roomName: params?.roomName || '',
    } as T;
  }

  /**
   * Check room name to be a Spektr room
   * @param roomName name of the room
   * @return {Boolean}
   */
  private isSpektrRoom(roomName?: string): boolean {
    if (!roomName) return false;

    return /^Nova Spektr MST \| [a-zA-Z\d.]+$/.test(roomName);
  }

  /**
   * Retrieve spektr_extras from room's topic event
   * @param room the room itself
   * @return {Object}
   */
  private getSpektrTopic(room: Room | null): SpektrExtras | undefined {
    if (!room) return;

    // on invite user only sees stripped state, which has '' as state key for all events
    const strippedStateKey = '';

    const topicEvent = room
      .getLiveTimeline()
      .getState(Direction.Forward)
      ?.events.get(EventType.RoomTopic)
      ?.get(strippedStateKey)?.event;

    return topicEvent?.content?.spektr_extras;
  }

  /**
   * Create Matrix client
   * @param credentials user credentials for Matrix
   * @return {Promise}
   */
  private async createMatrixClient(credentials: Omit<Credential, 'username' | 'isLastLogin'>): Promise<MatrixClient> {
    try {
      const indexedDBStore = new IndexedDBStore({
        indexedDB: window.indexedDB,
        localStorage: window.localStorage,
        dbName: 'matrix-sync',
      });
      await indexedDBStore.startup();

      return createClient({
        baseUrl: credentials.baseUrl,
        userId: credentials.userId,
        accessToken: credentials.accessToken,
        deviceId: credentials.deviceId,
        cryptoStore: new IndexedDBCryptoStore(window.indexedDB, 'matrix-crypto'),
        store: indexedDBStore as IStore,
        timelineSupport: true,
        cryptoCallbacks: this.secretStorage.cryptoCallbacks,
      });
    } catch (error) {
      throw this.createError(MatrixError.CREATE_MATRIX_CLIENT, error);
    }
  }

  /**
   * Check MST Event
   * @param event Matrix event
   * @return {Boolean}
   */
  private isSpektrMstEvent(event: MatrixEvent): boolean {
    return MST_EVENTS.includes(event.getType() as SpektrMstEvent);
  }

  /**
   * Create temporary client with specific baseUrl
   * @param url homeserver url
   */
  private createTempClient(url: string) {
    this.matrixClient = createClient({ baseUrl: url });
  }
}
