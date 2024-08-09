import Olm from '@matrix-org/olm';
import noop from 'lodash/noop';
import {
  AuthType,
  AutoDiscovery,
  ClientEvent,
  Direction,
  type EventTimeline,
  EventType,
  IndexedDBCryptoStore,
  IndexedDBStore,
  type MatrixClient,
  type MatrixEvent,
  MatrixEventEvent,
  Preset,
  type Room,
  RoomMemberEvent,
  Visibility,
  createClient,
} from 'matrix-js-sdk';
import { type ISecretStorageKeyInfo } from 'matrix-js-sdk/lib/crypto/api';
import { deriveKey } from 'matrix-js-sdk/lib/crypto/key_passphrase';
import { logger } from 'matrix-js-sdk/lib/logger';
import { type IStore } from 'matrix-js-sdk/lib/store';
import { SyncState } from 'matrix-js-sdk/lib/sync';

import { nonNullable } from '@shared/lib/utils';
import {
  BASE_MATRIX_URL,
  KEY_FILE_MAX_SIZE,
  MATRIX_HOME_SERVER,
  ROOM_CRYPTO_CONFIG,
  WELL_KNOWN_SERVERS,
} from '../lib/constants';
import MATRIX_ERRORS from '../lib/errors';
import {
  type ApprovePayload,
  type BaseMultisigPayload,
  type Callbacks,
  type CancelPayload,
  type Credential,
  type ErrorObject,
  type FinalApprovePayload,
  type ICredentialStorage,
  type ISecretStorage,
  type ISecureMessenger,
  type InvitePayload,
  type LoginFlows,
  MatrixError,
  Membership,
  type MultisigPayload,
  type RoomParams,
  type SpektrExtras,
  SpektrMultisigEvent,
  type UpdatePayload,
} from '../lib/types';

import CredentialStorage from './credentialStorage';
import SecretStorage from './secretStorage';

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
      onInvite: noop,
      onLogout: noop,
      onMultisigEvent: () => Promise.resolve(),
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
   *
   * @param domain Homeserver domain
   */
  async setHomeserver(domain: string): Promise<void> {
    const wellKnown = WELL_KNOWN_SERVERS.find((server) => server.domain === domain);

    if (wellKnown) {
      try {
        const config = { 'm.homeserver': { base_url: wellKnown.url } };
        await AutoDiscovery.fromDiscoveryConfig(config);
        this.createTempClient(wellKnown.url);
        localStorage.setItem(MATRIX_HOME_SERVER, wellKnown.url);

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
    localStorage.setItem(MATRIX_HOME_SERVER, discoveryResult['m.homeserver'].base_url);
  }

  getSsoLoginUrl(baseUrl: string, type: string, id: string): string {
    return this.matrixClient.getSsoLoginUrl(baseUrl, type, id);
  }

  /**
   * Get available login flows
   */
  async loginFlows(): Promise<LoginFlows> {
    try {
      const { flows } = await this.matrixClient.loginFlows();

      return flows.reduce<LoginFlows>(
        (acc, flow) => {
          if (flow.type === 'm.login.token') acc.token = true;
          if (flow.type === 'm.login.password') acc.password = true;
          if (flow.type === 'm.login.sso' && 'identity_providers' in flow) {
            acc.sso = (flow.identity_providers || [])
              .filter(({ brand }) => brand === 'github' || brand === 'google')
              .map(({ id, name, brand }) => ({ id, name, brand: brand || name.toLowerCase() }));
          }

          return acc;
        },
        { token: false, password: false, sso: [] },
      );
    } catch (error) {
      throw this.createError(MatrixError.LOGIN_FLOWS, error);
    }
  }

  /**
   * Login user to Matrix with credentials
   *
   * @param login Login value
   * @param password Password value
   *
   * @returns {Promise}
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
   *
   * @returns {Promise}
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
   * Login user to Matrix with SSO token
   *
   * @param token Sso token
   *
   * @returns {Promise}
   */
  async loginWithSso(token: string): Promise<void> {
    try {
      await this.initClientWithSso(token);
      await this.matrixClient.initCrypto();
      await this.matrixClient.startClient({ lazyLoadMembers: true });
      this.matrixClient.setGlobalErrorOnUnknownDevices(false);
      this.subscribeToEvents();
    } catch (error) {
      throw this.createError(MatrixError.LOGIN_CREDS, error);
    }
  }

  /**
   * Register user in Matrix
   *
   * @param login Login value
   * @param password Password value
   *
   * @returns {Promise}
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
   *
   * @param securityKey Secret user's key
   *
   * @returns {Promise}
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
   *
   * @param securityFile Secret user's file
   *
   * @returns {Promise}
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
   *
   * @param securityPhrase Secret user's phrase
   *
   * @returns {Promise}
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
   *
   * @returns {Promise}
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
   *
   * @param params Room configuration
   *
   * @returns {Promise}
   */
  async createRoom(params: RoomParams): Promise<string> {
    try {
      const { room_id: roomId } = await this.matrixClient.createRoom({
        name: `Nova Spektr MST | ${params.accountName}`,
        visibility: Visibility.Private,
        preset: Preset.TrustedPrivateChat,
      });

      const matrixIds = params.signatories.map((s) => s.matrixId).filter(nonNullable);

      await this.initStateEvents(roomId, params);
      await this.inviteSignatories(roomId, matrixIds);

      return roomId;
    } catch (error) {
      throw this.createError(MatrixError.CREATE_ROOM, error);
    }
  }

  /**
   * Leave MST room
   *
   * @param roomId Room's identifier
   *
   * @returns {Promise}
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
   *
   * @param roomId Room's identifier
   *
   * @returns {Promise}
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
   *
   * @param roomId Room's identifier
   * @param signatoryId Signatory's identifier
   *
   * @returns {Promise}
   */
  async invite(roomId: string, signatoryId: string): Promise<void> {
    try {
      await this.matrixClient.invite(roomId, signatoryId);
    } catch (error) {
      throw this.createError(MatrixError.INVITE_IN_ROOM, error);
    }
  }

  /**
   * List of joined Nova Spektr rooms
   *
   * @param accountId Multisig account id
   *
   * @returns {Array}
   */
  joinedRooms(accountId?: string): Room[] {
    return this.matrixClient.getRooms().filter((room) => {
      const isSpektrRoom = this.isSpektrRoom(room);
      const isJoinedRoom = room.getMyMembership() === Membership.JOIN;
      if (!isSpektrRoom || !isJoinedRoom) return false;

      return !accountId || this.getSpektrTopic(room)?.mstAccount?.accountId === accountId;
    });
  }

  /**
   * Send message to active room
   *
   * @param roomId Room's identifier
   * @param message Sending message
   *
   * @returns {Promise}
   */
  async sendMessage(roomId: string, message: string): Promise<string> {
    try {
      const response = await this.matrixClient.sendTextMessage(roomId, message);

      return response.event_id;
    } catch (error) {
      throw this.createError(MatrixError.MESSAGE, error);
    }
  }

  /**
   * Mark latest event as read
   *
   * @param readEventId Identifier of the last read event
   * @param events Timeline events
   *
   * @returns {Promise}
   */
  async markAsRead(readEventId: string, events: MatrixEvent[]): Promise<void> {
    if (events.length === 0) return;

    let latestEvent = null;
    for (let index = events.length - 1; index >= 0; index -= 1) {
      const event = events[index];
      if (event.getId() === readEventId) break;
      if (events[index].isSending()) continue;

      latestEvent = events[index];
      break;
    }

    if (latestEvent === null) return;

    try {
      await this.matrixClient.sendReadReceipt(latestEvent);
    } catch (error) {
      throw this.createError(MatrixError.MARK_AS_READ, error);
    }
  }

  /**
   * Set callbacks for Matrix events
   *
   * @param handlers Aggregated callback handlers
   */
  setEventCallbacks(handlers: Callbacks) {
    this.eventCallbacks = handlers;
  }

  /**
   * Send MST_UPDATE state event to the room Initialize
   * multi-sig transaction
   *
   * @param roomId Room's identifier
   * @param params MST parameters
   *
   * @returns {Promise}
   */
  async sendUpdate(roomId: string, params: UpdatePayload): Promise<void> {
    try {
      await this.matrixClient.sendEvent(roomId, SpektrMultisigEvent.UPDATE, params);
    } catch (error) {
      throw this.createError(MatrixError.MST_UPDATE, error);
    }
  }

  /**
   * Send MST_APPROVE state event to the room Approve
   * multi-sig transaction
   *
   * @param roomId Room's identifier
   * @param params MST parameters
   *
   * @returns {Promise}
   */
  async sendApprove(roomId: string, params: ApprovePayload): Promise<void> {
    try {
      await this.matrixClient.sendEvent(roomId, SpektrMultisigEvent.APPROVE, params);
    } catch (error) {
      throw this.createError(MatrixError.MST_APPROVE, error);
    }
  }

  // TODO: experimental mstEvent for thread
  /**
   * Send MST_APPROVE event to thread
   *
   * @param roomId Room's identifier
   * @param thread Root event id of the thread
   * @param params MST parameters
   *
   * @returns {Promise}
   */
  async mstApprove_NEW(roomId: string, thread: string, params: ApprovePayload): Promise<void> {
    try {
      await this.matrixClient.sendEvent(roomId, thread, SpektrMultisigEvent.APPROVE, params);
    } catch (error) {
      throw this.createError(MatrixError.MST_APPROVE, error);
    }
  }

  /**
   * Send MST_FINAL_APPROVE state event to the room Final
   * approve for multi-sig transaction
   *
   * @param roomId Room's identifier
   * @param params MST parameters
   *
   * @returns {Promise}
   */
  async sendFinalApprove(roomId: string, params: FinalApprovePayload): Promise<void> {
    try {
      await this.matrixClient.sendEvent(roomId, SpektrMultisigEvent.FINAL_APPROVE, params);
    } catch (error) {
      throw this.createError(MatrixError.MST_FINAL_APPROVE, error);
    }
  }

  /**
   * Send MST_CANCEL state event to the room Cancel
   * multi-sig transaction
   *
   * @param roomId Room's identifier
   * @param params MST parameters
   *
   * @returns {Promise}
   */
  async sendCancel(roomId: string, params: CancelPayload): Promise<void> {
    try {
      await this.matrixClient.sendEvent(roomId, SpektrMultisigEvent.CANCEL, params);
    } catch (error) {
      throw this.createError(MatrixError.MST_CANCEL, error);
    }
  }

  /**
   * Paginate timelines of all Nova Spektr rooms
   *
   * @returns {Promise}
   */
  async syncSpektrTimeline(): Promise<void> {
    const { read, load } = this.matrixClient.getRooms().reduce<Record<'read' | 'load', Promise<void>[]>>(
      (acc, room) => {
        const readUpEventId = room.getEventReadUpTo(this.userId || '');

        if (!this.isSpektrRoom(room) || !readUpEventId) return acc;

        const timelineSet = room.getUnfilteredTimelineSet();
        const liveTimeline = timelineSet.getLiveTimeline();
        const readUpEvent = timelineSet.findEventById(readUpEventId);

        if (readUpEvent) {
          acc.read.push(this.markAsRead(readUpEventId, liveTimeline.getEvents()));
        } else {
          acc.load.push(this.paginateTimeline(liveTimeline, true));
        }

        return acc;
      },
      { read: [], load: [] },
    );

    try {
      if (read.length) {
        await Promise.allSettled(read);
      }
      if (load.length) {
        await Promise.allSettled(load);
        await this.syncSpektrTimeline();
      }
    } catch (error) {
      console.warn(error);
    }
  }

  // =====================================================
  // ================= Public helpers ====================
  // =====================================================

  isUpdateEvent(type: SpektrMultisigEvent, content?: BaseMultisigPayload): content is UpdatePayload {
    return type === SpektrMultisigEvent.UPDATE;
  }

  isApproveEvent(type: SpektrMultisigEvent, content?: BaseMultisigPayload): content is ApprovePayload {
    return type === SpektrMultisigEvent.APPROVE;
  }

  isFinalApproveEvent(type: SpektrMultisigEvent, content?: BaseMultisigPayload): content is FinalApprovePayload {
    return type === SpektrMultisigEvent.FINAL_APPROVE;
  }

  isCancelEvent(type: SpektrMultisigEvent, content?: BaseMultisigPayload): content is CancelPayload {
    return type === SpektrMultisigEvent.CANCEL;
  }

  // =====================================================
  // ====================== Getters ======================
  // =====================================================

  /**
   * Get matrix userId
   *
   * @returns {String | undefined}
   */
  get userId(): string | undefined {
    return this.matrixClient.getUserId() || undefined;
  }

  /**
   * Is Matrix user logged in
   *
   * @returns {Boolean}
   */
  get userIsLoggedIn(): boolean {
    return this.matrixClient.isLoggedIn();
  }

  /**
   * Get device session key
   *
   * @returns {String | undefined}
   */
  get sessionKey(): string | undefined {
    return this.matrixClient.getDeviceEd25519Key() || undefined;
  }

  /**
   * Get current device cross sign verification status
   *
   * @returns {Boolean}
   */
  get sessionIsVerified(): boolean {
    if (!this.userId) return false;

    try {
      const mx = this.matrixClient;
      const crossSignInfo = mx.getStoredCrossSigningForUser(this.userId);
      const deviceId = mx.getDeviceId();
      if (!deviceId || !crossSignInfo) return false;

      const deviceInfo = mx.getStoredDevice(this.userId, deviceId);
      if (!deviceInfo) return false;

      const deviceTrust = crossSignInfo.checkDeviceTrust(crossSignInfo, deviceInfo, false, true);

      return deviceTrust.isCrossSigningVerified();
    } catch {
      console.info('🔸 Matrix Crypto is inactive or about to start');

      return false;
    }
  }

  // =====================================================
  // ================= Private methods ===================
  // =====================================================

  /**
   * Send encryption and topic events
   *
   * @param roomId Matrix room ID
   * @param params Room parameters
   *
   * @returns {Promise}
   */
  private async initStateEvents(roomId: string, params: RoomParams): Promise<void> {
    try {
      await this.matrixClient.sendStateEvent(roomId, EventType.RoomEncryption, ROOM_CRYPTO_CONFIG);
    } catch (error) {
      throw this.createError(MatrixError.ROOM_ENCRYPTION, error);
    }

    try {
      const payload: SpektrExtras = {
        mstAccount: {
          accountName: params.accountName,
          threshold: params.threshold,
          signatories: params.signatories.map((s) => s.accountId),
          accountId: params.accountId,
          cryptoType: params.cryptoType,
          chainId: params.chainId,
          creatorAccountId: params.creatorAccountId,
        },
      };
      await this.matrixClient.sendStateEvent(roomId, 'm.room.topic', {
        topic: `Room for Multisignatory account | ${params.accountName}`,
        spektr_extras: payload,
      });
    } catch (error) {
      throw this.createError(MatrixError.ROOM_TOPIC, error);
    }
  }

  /**
   * Invite signatories to Matrix room
   *
   * @param roomId Matrix room ID
   * @param matrixIds List of signatories' matrix ids
   *
   * @returns {Promise}
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
   * Initiate Matrix client with user credentials
   *
   * @param username User's login
   * @param password User's password
   *
   * @returns {Promise}
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
   * Initiate Matrix client with SSO
   *
   * @returns {Promise}
   */
  private async initClientWithSso(token: string): Promise<void> {
    const baseUrl = localStorage.getItem(MATRIX_HOME_SERVER);
    if (!baseUrl) return;

    try {
      this.createTempClient(baseUrl);

      const userLoginResult = await this.matrixClient.login('m.login.token', {
        token,
        initial_device_display_name: process.env.PRODUCT_NAME,
      });

      this.matrixClient = await this.createMatrixClient({
        baseUrl: this.matrixClient.baseUrl,
        userId: userLoginResult.user_id,
        accessToken: userLoginResult.access_token,
        deviceId: userLoginResult.device_id,
      });

      const credentials = this.credentialStorage.getCredentials('userId', userLoginResult);

      if (credentials) {
        this.credentialStorage.updateCredentials(credentials.userId, {
          accessToken: userLoginResult.access_token,
          isLastLogin: true,
        });
      } else {
        this.credentialStorage.saveCredentials({
          username: this.matrixClient.getUser(userLoginResult.user_id)?.displayName || userLoginResult.user_id,
          userId: userLoginResult.user_id,
          accessToken: userLoginResult.access_token,
          deviceId: userLoginResult.device_id,
          baseUrl: this.matrixClient.baseUrl,
          isLastLogin: true,
        });
      }
    } catch (error) {
      throw this.createError(MatrixError.INIT_WITH_SSO, error);
    }
  }

  /**
   * Initiate Matrix client from storage (cache)
   *
   * @returns {Promise}
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
    // this.handleEchoEvents();
  }

  /**
   * Handle sync event
   */
  private handleSyncEvent() {
    this.matrixClient.on(ClientEvent.Sync, (state) => {
      if (state !== SyncState.Prepared) return;

      this.eventCallbacks.onSyncEnd();
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
        await this.matrixClient.getRoomSummary(roomId);
        const room = this.matrixClient.getRoom(roomId);
        if (!room) return;

        const roomIsValid = this.isSpektrRoom(room);
        const topic = this.getSpektrTopic(room);
        const userHasJoined = room?.getMyMembership() === Membership.JOIN;
        if (!roomIsValid || !topic || userHasJoined) return;

        console.info('🔸 Invite event - ', event.getSender(), member.membership, roomId);

        const payload = this.createEventPayload<InvitePayload>(event, {
          content: topic,
          roomName: room.name,
        });
        this.eventCallbacks.onInvite(payload);
      } catch {
        console.info(`Room doesn't exist (inviter has left) - reject invite`);
        await this.leaveRoom(roomId);
      }
    });
  }

  /**
   * Handle decrypted events (MST and messages)
   */
  private handleDecryptedEvents() {
    this.matrixClient.on(MatrixEventEvent.Decrypted, (event) => {
      if (event.getSender() === this.userId) return;

      const room = this.matrixClient.getRoom(event.getRoomId());
      if (!room || !this.isSpektrRoom(room)) return;

      if (this.isSpektrMultisigEvent(event)) {
        const payload = this.createEventPayload<MultisigPayload>(event);
        this.eventCallbacks
          .onMultisigEvent(payload, this.getSpektrTopic(room))
          .catch((error) => console.warn('onMultisigEvent error - ', error));
      }
      // if (event.getType() === EventType.RoomMessage) {
      //   const payload = event.getContent().body;
      //   this.eventCallbacks.onMessage(payload);
      // }
    });
  }

  /**
   * Paginate timeline backwards or forward
   *
   * @param timeline Timeline to be traversed
   * @param backwards Flag of traversal direction
   * @param limit How much records to retrieve
   *
   * @returns {Promise}
   */
  private async paginateTimeline(timeline: EventTimeline, backwards: boolean, limit = 30): Promise<void> {
    const token = timeline.getPaginationToken(backwards ? Direction.Backward : Direction.Forward);
    if (!token) return;

    try {
      await this.matrixClient.paginateEventTimeline(timeline, { backwards, limit });
    } catch (error) {
      throw this.createError(MatrixError.TIMELINE_PAGINATION, error);
    }
  }

  /**
   * All events are echoed at the client side Handle echo
   * events (update, approve, final, cancel)
   *
   * Might be useful in future
   *
   * @link https://spec.matrix.org/v1.6/client-server-api/#local-echo
   */
  // TODO: Uncomment if we will decide to use echo events
  // private handleEchoEvents() {
  //   this.matrixClient.on(RoomEvent.LocalEchoUpdated, (event, room) => {
  //     if (event.getSender() !== this.userId || event.status !== 'sent') return;

  //     if (!this.isSpektrMultisigEvent(event) || !this.isSpektrRoom(room)) return;

  //     const payload = this.createEventPayload<MultisigPayload>(event);
  //     this.eventCallbacks.onMultisigEvent(payload, this.getSpektrTopic(room)).catch(console.warn);
  //   });
  // }

  // =====================================================
  // ====================== Helpers ======================
  // =====================================================

  /**
   * Create error object
   *
   * @param error Error code and message
   * @param origin Original error object
   *
   * @returns {ErrorObject}
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
   *
   * @param event Matrix event object
   * @param params Content and roomName
   *
   * @returns {Object}
   */
  private createEventPayload<T extends MultisigPayload | InvitePayload>(
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
   * Check room to be a Spektr room
   *
   * @param room Matrix room
   *
   * @returns {Boolean}
   */
  private isSpektrRoom(room: Room | null): boolean {
    if (!room) return false;

    const topicEvents = room.getLiveTimeline().getState(Direction.Forward)?.getStateEvents(EventType.RoomTopic);
    if (!topicEvents?.length) return false;

    return Boolean(topicEvents[0].getContent()['spektr_extras']);
  }

  /**
   * Retrieve spektr_extras from room's topic event
   *
   * @param room The room itself
   *
   * @returns {Object}
   */
  private getSpektrTopic(room: Room): SpektrExtras | undefined {
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
   *
   * @param credentials User credentials for Matrix
   *
   * @returns {Promise}
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
   *
   * @param event Matrix event
   *
   * @returns {Boolean}
   */
  private isSpektrMultisigEvent(event: MatrixEvent): boolean {
    const type = event.getType() as SpektrMultisigEvent;

    return (
      this.isUpdateEvent(type) ||
      this.isApproveEvent(type) ||
      this.isFinalApproveEvent(type) ||
      this.isCancelEvent(type)
    );
  }

  /**
   * Create temporary client with specific baseUrl
   *
   * @param url Homeserver url
   */
  private createTempClient(url: string) {
    this.matrixClient = createClient({ baseUrl: url });
  }
}
