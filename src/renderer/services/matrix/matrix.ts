import Olm from '@matrix-org/olm';
// @ts-ignore
import olmWasmPath from '@matrix-org/olm/olm.wasm';
import { uniq } from 'lodash';
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
} from 'matrix-js-sdk';
import { ISecretStorageKeyInfo } from 'matrix-js-sdk/lib/crypto/api';
import { deriveKey } from 'matrix-js-sdk/lib/crypto/key_passphrase';
import { IStore } from 'matrix-js-sdk/lib/store';
import { SyncState } from 'matrix-js-sdk/lib/sync';

import { BASE_MATRIX_URL, KEY_FILE_MAX_SIZE, MST_EVENTS, ROOM_CRYPTO_CONFIG } from './common/constants';
import MATRIX_ERRORS from './common/errors';
import {
  Callbacks,
  Credential,
  ErrorObject,
  Errors,
  ICredentialStorage,
  InvitePayload,
  ISecretStorage,
  ISecureMessenger,
  Membership,
  MstParams,
  MSTPayload,
  OmniExtras,
  OmniMstEvents,
  RoomParams,
  Signatory,
} from './common/types';
import CredentialStorage from './credentialStorage';
import SecretStorage from './secretStorage';

export class Matrix implements ISecureMessenger {
  private baseUrl: string;
  private matrixClient: MatrixClient;
  private activeRoomId: string;
  private isClientSynced: boolean;
  private isEncryptionActive: boolean;
  private subscribeHandlers?: Callbacks;
  private credentialStorage: ICredentialStorage;
  private secretStorage: ISecretStorage;

  constructor() {
    this.baseUrl = '';
    this.activeRoomId = '';
    this.isClientSynced = false;
    this.isEncryptionActive = false;
    this.credentialStorage = new CredentialStorage();
    this.secretStorage = new SecretStorage();
    this.matrixClient = createClient(BASE_MATRIX_URL);
  }

  // =====================================================
  // ================= Public methods ====================
  // =====================================================

  /**
   * Initialize Matrix protocol with encryption
   * @return {Promise}
   * @throws {ErrorObject}
   */
  async init(): Promise<void | never> {
    if (this.isEncryptionActive) {
      throw this.createError(Errors.ENCRYPTION_STARTED);
    }

    try {
      await Olm.init({ locateFile: () => olmWasmPath });
      this.isEncryptionActive = true;
      console.info('=== 🟢 Olm started 🟢 ===');
    } catch (error) {
      throw this.createError(Errors.OLM_FAILED, error);
    }
  }

  /**
   * Set homeserver and update base url
   * @param url homeserver url
   * @throws {ErrorObject}
   */
  async setHomeserver(url: string): Promise<void | never> {
    const normalizedUrl = url.replace(/^http(s)?:\/\//, '');
    let response;

    try {
      response = await fetch(`https://${normalizedUrl}/_matrix/client/versions`);
    } catch (error) {
      throw this.createError(Errors.WRONG_HOMESERVER, error);
    }

    if (response?.status !== 200) {
      this.createError(Errors.WRONG_HOMESERVER);
    }
    this.setBaseUrl(`https://${normalizedUrl}`);
  }

  /**
   * Save skip flag to the storage
   */
  skipLogin(value: boolean): void {
    this.credentialStorage.saveSkipLogin({ skip: value });
  }

  /**
   * Login user to Matrix
   * @param login login value
   * @param password password value
   * @return {Promise}
   * @throws {ErrorObject}
   */
  async loginWithCreds(login: string, password: string): Promise<void | never> {
    if (!this.isEncryptionActive) {
      throw this.createError(Errors.ENCRYPTION_NOT_STARTED);
    }

    try {
      await this.initClientWithCreds(login, password);
      await this.matrixClient.initCrypto();
      await this.matrixClient.startClient({ lazyLoadMembers: true });
      this.matrixClient.setGlobalErrorOnUnknownDevices(false);
      this.subscribeToEvents();
      this.skipLogin(false);
    } catch (error) {
      throw this.createError(Errors.LOGIN_CREDS, error);
    }
  }

  /**
   * Login user to Matrix with cached credentials
   * @return {Promise}
   * @throws {ErrorObject}
   */
  async loginFromCache(): Promise<void | never> {
    if (!this.isEncryptionActive) {
      throw this.createError(Errors.ENCRYPTION_NOT_STARTED);
    }
    if (this.credentialStorage.getSkipLogin().skip) return;

    try {
      await this.initClientFromCache();
      await this.matrixClient.initCrypto();
      await this.matrixClient.startClient({ lazyLoadMembers: true });
      this.matrixClient.setGlobalErrorOnUnknownDevices(false);
      this.subscribeToEvents();
      this.skipLogin(false);
    } catch (error) {
      throw this.createError(Errors.LOGIN_CACHE, error);
    }
  }

  /**
   * Register user in Matrix
   * @param login login value
   * @param password password value
   * @return {Promise}
   * @throws {ErrorObject}
   */
  // async registration(login: string, password: string): Promise<void | never> {
  //   try {
  //     const auth = { type: 'm.login.omni_matrix_protocol' };
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
   * @throws {ErrorObject}
   */
  async verifyWithKey(securityKey: string): Promise<boolean | never> {
    this.checkClientLoggedIn();

    try {
      const mx = this.matrixClient;
      const defaultSSKey = mx.getAccountData('m.secret_storage.default_key').getContent().key;
      const sSKeyInfo = mx.getAccountData(`m.secret_storage.key.${defaultSSKey}`).getContent<ISecretStorageKeyInfo>();
      const privateKey = mx.keyBackupKeyFromRecoveryKey(securityKey);
      const isCorrect = await mx.checkSecretStorageKey(privateKey, sSKeyInfo);
      if (isCorrect) {
        this.secretStorage.storePrivateKey(defaultSSKey, privateKey);
        await mx.checkOwnCrossSigningTrust();
      }

      return isCorrect;
    } catch (error) {
      throw this.createError(Errors.KEY_VERIFICATION, error);
    }
  }

  /**
   * Verify user with Cross signing security file
   * @param securityFile secret user's file
   * @return {Promise}
   * @throws {ErrorObject}
   */
  async verifyWithFile(securityFile: File): Promise<boolean | never> {
    this.checkClientLoggedIn();

    if (securityFile.size > KEY_FILE_MAX_SIZE) {
      throw this.createError(Errors.VERIFY_FILE_MAX_SIZE);
    }

    let securityKey = '';
    try {
      const fileKey = await securityFile.text();
      securityKey = fileKey.replace(/(\r\n|\n|\r)/gm, ' ');
    } catch (error) {
      throw this.createError(Errors.VERIFY_FILE_MAX_SIZE, error);
    }

    // test it's within the base58 alphabet
    if (!/^[123456789A-Za-z\s]+$/.test(securityKey)) {
      throw this.createError(Errors.VERIFY_FILE_BAD_CONTENT);
    }

    try {
      return this.verifyWithKey(securityKey);
    } catch (error) {
      throw this.createError(Errors.FILE_VERIFICATION, error);
    }
  }

  /**
   * Verify user with Cross signing security phrase
   * @param securityPhrase secret user's phrase
   * @return {Promise}
   * @throws {ErrorObject}
   */
  async verifyWithPhrase(securityPhrase: string): Promise<boolean | never> {
    this.checkClientLoggedIn();

    try {
      const mx = this.matrixClient;

      const defaultSSKey = mx.getAccountData('m.secret_storage.default_key').getContent().key;
      const sSKeyInfo = mx.getAccountData(`m.secret_storage.key.${defaultSSKey}`).getContent<ISecretStorageKeyInfo>();
      const { salt, iterations } = sSKeyInfo.passphrase || {};
      const privateKey = await deriveKey(securityPhrase, salt, iterations);
      const isCorrect = await mx.checkSecretStorageKey(privateKey, sSKeyInfo);
      if (isCorrect) {
        this.secretStorage.storePrivateKey(defaultSSKey, privateKey);
        await mx.checkOwnCrossSigningTrust();
      }

      return isCorrect;
    } catch (error) {
      throw this.createError(Errors.PHRASE_VERIFICATION, error);
    }
  }

  /**
   * Stop the client and remove handlers
   */
  stopClient(): void {
    this.matrixClient.stopClient();
    this.clearSubscribers();
  }

  /**
   * Logout user from Matrix and clean storages
   * @return {Promise}
   * @throws {ErrorObject}
   */
  async logout(): Promise<void | never> {
    this.checkClientLoggedIn();

    const credentials = this.credentialStorage.getCredentials('userId', this.userId);
    if (!credentials) {
      throw this.createError(Errors.LOGOUT);
    }
    this.credentialStorage.updateCredentials(credentials.userId, { isLastLogin: false });

    try {
      this.stopClient();
      await this.matrixClient.logout();
      await this.matrixClient.clearStores();
      this.credentialStorage.clear();
    } catch (error) {
      throw this.createError(Errors.LOGOUT, error);
    }
  }

  /**
   * Start room creation process for new MST account
   * @param mstAccountAddress room configuration
   * @return {Promise}
   * @throws {ErrorObject}
   */
  async startRoomCreation(mstAccountAddress: string): Promise<Record<'roomId' | 'sign', string> | never> {
    this.checkClientLoggedIn();

    try {
      const { room_id: roomId } = await this.matrixClient.createRoom({
        name: `OMNI MST | ${mstAccountAddress}`,
        visibility: Visibility.Private,
        preset: Preset.TrustedPrivateChat,
      });

      return { roomId, sign: `${mstAccountAddress}${roomId}` };
    } catch (error) {
      throw this.createError(Errors.START_ROOM, error);
    }
  }

  /**
   * Finish room creation process for new MST account
   * @param params room configuration
   * @return {Promise}
   * @throws {ErrorObject}
   */
  async finishRoomCreation(params: RoomParams): Promise<void | never> {
    this.checkClientLoggedIn();

    try {
      await this.initStateEvents(params);
      await this.inviteSignatories(params.roomId, params.signatories);

      const members = params.signatories.map((signatory) => signatory.matrixAddress);
      await this.verifyDevices(members);
    } catch (error) {
      throw this.createError(Errors.FINISH_ROOM, error);
    }
  }

  /**
   * Leave MST room
   * @param roomId room's identifier
   * @return {Promise}
   * @throws {ErrorObject}
   */
  async leaveRoom(roomId: string): Promise<void | never> {
    this.checkClientLoggedIn();

    try {
      await this.matrixClient.leave(roomId);
    } catch (error) {
      throw this.createError(Errors.LEAVE_ROOM, error);
    }
  }

  /**
   * Cancel room creation and leave the room
   * @param roomId room's identifier
   * @return {Promise}
   * @throws {ErrorObject}
   */
  async cancelRoomCreation(roomId: string): Promise<void | never> {
    await this.leaveRoom(roomId);
  }

  /**
   * Join existing MST room, skips if already joined
   * @param roomId room's identifier
   * @return {Promise}
   * @throws {ErrorObject}
   */
  async joinRoom(roomId: string): Promise<void | never> {
    this.checkClientLoggedIn();

    try {
      await this.matrixClient.joinRoom(roomId);
    } catch (error) {
      throw this.createError(Errors.JOIN_ROOM, error);
    }
  }

  /**
   * Invite signatory to exist MST room
   * @param roomId room's identifier
   * @param signatoryId signatory's identifier
   * @return {Promise}
   * @throws {ErrorObject}
   */
  async invite(roomId: string, signatoryId: string): Promise<void | never> {
    this.checkClientLoggedIn();

    try {
      await this.matrixClient.invite(roomId, signatoryId);
    } catch (error) {
      throw this.createError(Errors.INVITE_IN_ROOM, error);
    }
  }

  /**
   * List of available OMNI rooms
   * @param type which rooms to get Invite/Join
   * @return {Array}
   */
  listOfOmniRooms(type: Membership.INVITE | Membership.JOIN): Room[] {
    this.checkClientLoggedIn();

    return this.matrixClient.getRooms().filter((room) => this.isOmniRoom(room.name) && room.getMyMembership() === type);
  }

  /**
   * Set active room id
   * @param roomId room's identifier
   */
  setActiveRoom(roomId: string): void {
    this.activeRoomId = roomId;
  }

  /**
   * Get live timeline events for all rooms
   * @return {Array}
   * @throws {ErrorObject}
   */
  async readTimeline(): Promise<MSTPayload[] | never> {
    let rooms;
    try {
      const data = await this.matrixClient.getJoinedRooms();
      rooms = data.joined_rooms || [];
    } catch (error) {
      throw this.createError(Errors.JOINED_ROOMS, error);
    }

    const timeline = rooms.reduce((acc, roomId) => {
      const room = this.matrixClient.getRoom(roomId);
      if (!room || !this.isOmniRoom(room.name)) return acc;

      const roomTimeline = room
        .getLiveTimeline()
        .getEvents()
        .filter((event) => this.isMstEvent(event) && event.getSender() !== this.userId);

      if (roomTimeline.length > 0) {
        acc.push(...roomTimeline);
      }

      return acc;
    }, [] as MatrixEvent[]);

    try {
      await Promise.all(timeline.map(this.markAsRead));
    } catch (error) {
      throw this.createError(Errors.READ_TIMELINE, error);
    }

    return timeline.map((event) => this.createEventPayload<MSTPayload>(event));
  }

  /**
   * Send message to active room
   * @param message sending message
   * @return {Promise}
   */
  async sendMessage(message: string): Promise<void> {
    this.checkClientLoggedIn();
    this.checkInsideRoom();

    try {
      await this.matrixClient.sendTextMessage(this.activeRoomId, message);
    } catch (error) {
      throw this.createError(Errors.MESSAGE, error);
    }
  }

  /**
   * Mark event as read
   * @param event Matrix event that must be marked as read
   * @return {Promise}
   */
  async markAsRead(event: MatrixEvent): Promise<void | never> {
    this.checkClientLoggedIn();

    try {
      await this.matrixClient.sendReadReceipt(event);
    } catch (error) {
      throw this.createError(Errors.MARK_AS_READ, error);
    }
  }

  /**
   * Setup subscription
   * @param handlers aggregated callback handlers
   */
  setupSubscribers(handlers: Callbacks): void {
    // TODO: add possibility to add more than one handler for one event
    this.subscribeHandlers = handlers;
  }

  /**
   * Clear subscription
   */
  clearSubscribers(): void {
    this.matrixClient.removeAllListeners();
    this.subscribeHandlers = undefined as unknown as Callbacks;
  }

  /**
   * Check does User already exist
   * @param userId matrix identifier
   * @return {Promise}
   * @throws {ErrorObject}
   */
  // async checkUserExists(userId: string): Promise<boolean | never> {
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
   * @param params MST parameters
   * @return {Promise}
   * @throws {ErrorObject}
   */
  async mstInitiate(params: MstParams): Promise<void | never> {
    this.checkClientLoggedIn();
    this.checkInsideRoom();

    try {
      await this.matrixClient.sendEvent(this.activeRoomId, OmniMstEvents.INIT, params);
    } catch (error) {
      throw this.createError(Errors.MST_INIT, error);
    }
  }

  /**
   * Send MST_APPROVE state event to the room
   * Approve multi-sig transaction
   * @param params MST parameters
   * @return {Promise}
   * @throws {ErrorObject}
   */
  async mstApprove(params: MstParams): Promise<void | never> {
    this.checkClientLoggedIn();
    this.checkInsideRoom();

    try {
      await this.matrixClient.sendEvent(this.activeRoomId, OmniMstEvents.APPROVE, params);
    } catch (error) {
      throw this.createError(Errors.MST_APPROVE, error);
    }
  }

  /**
   * Send MST_FINAL_APPROVE state event to the room
   * Final approve for multi-sig transaction
   * @param params MST parameters
   * @return {Promise}
   * @throws {ErrorObject}
   */
  async mstFinalApprove(params: MstParams): Promise<void | never> {
    this.checkClientLoggedIn();
    this.checkInsideRoom();

    try {
      await this.matrixClient.sendEvent(this.activeRoomId, OmniMstEvents.FINAL_APPROVE, params);
    } catch (error) {
      throw this.createError(Errors.MST_FINAL_APPROVE, error);
    }
  }

  /**
   * Send MST_CANCEL state event to the room
   * Cancel multi-sig transaction
   * @param params MST parameters
   * @return {Promise}
   * @throws {ErrorObject}
   */
  async mstCancel(params: MstParams): Promise<void | never> {
    this.checkClientLoggedIn();
    this.checkInsideRoom();

    try {
      await this.matrixClient.sendEvent(this.activeRoomId, OmniMstEvents.CANCEL, params);
    } catch (error) {
      throw this.createError(Errors.MST_CANCEL, error);
    }
  }

  // =====================================================
  // ====================== Getters ======================
  // =====================================================

  /**
   * Get matrix userId
   * @return {String}
   */
  get userId(): string {
    return this.matrixClient.getUserId() || '';
  }

  /**
   * Is Matrix user logged in
   * @return {Boolean}
   */
  get isLoggedIn(): boolean {
    return Boolean(this.matrixClient.isLoggedIn());
  }

  /**
   * Is Matrix client synced
   * @return {Boolean}
   */
  get isSynced(): boolean {
    return this.isLoggedIn && this.isClientSynced;
  }

  /**
   * Get device session key
   * @return {String}
   */
  get sessionKey(): string {
    return this.matrixClient.getDeviceEd25519Key();
  }

  /**
   * Get current device cross sign verification status
   * @return {Boolean}
   */
  get isVerified(): boolean {
    this.checkClientLoggedIn();

    const mx = this.matrixClient;
    const crossSignInfo = mx.getStoredCrossSigningForUser(this.userId);
    const deviceInfo = mx.getStoredDevice(this.userId, mx.getDeviceId());
    const deviceTrust = crossSignInfo.checkDeviceTrust(crossSignInfo, deviceInfo, false, true);

    return deviceTrust.isCrossSigningVerified();
  }

  // =====================================================
  // ================= Private methods ===================
  // =====================================================

  /**
   * Send encryption and topic events
   * @param params room parameters
   * @return {Promise}
   * @throws {ErrorObject}
   */
  private async initStateEvents(params: RoomParams): Promise<void | never> {
    try {
      await this.matrixClient.sendStateEvent(params.roomId, 'm.room.encryption', ROOM_CRYPTO_CONFIG);
    } catch (error) {
      throw this.createError(Errors.ROOM_ENCRYPTION, error);
    }

    try {
      const omniExtras = {
        mst_account: {
          accountName: params.accountName,
          threshold: params.threshold,
          signatories: params.signatories.map((signatory) => signatory.accountId),
          address: params.mstAccountAddress,
        },
        invite: {
          signature: params.signature,
          public_key: params.inviterPublicKey,
        },
      };
      await this.matrixClient.sendStateEvent(params.roomId, 'm.room.topic', {
        topic: `Room for communications for ${params.mstAccountAddress} MST account`,
        omni_extras: omniExtras,
      });
    } catch (error) {
      throw this.createError(Errors.ROOM_TOPIC, error);
    }
  }

  /**
   * Invite signatories to Matrix room
   * @param roomId Matrix room Id
   * @param signatories list of signatories' data
   * @return {Promise}
   * @throws {ErrorObject}
   */
  private async inviteSignatories(roomId: string, signatories: Signatory[]): Promise<void | never> {
    const inviterAddress = signatories.find((s) => s.isInviter)?.matrixAddress;

    const noDuplicates = uniq(
      signatories.filter((s) => !s.isInviter && s.matrixAddress !== inviterAddress).map((s) => s.matrixAddress),
    );

    const inviteRequests = noDuplicates.reduce((acc, matrixAddress) => {
      acc.push(this.matrixClient.invite(roomId, matrixAddress));

      return acc;
    }, [] as Promise<unknown>[]);

    try {
      await Promise.all(inviteRequests);
    } catch (error) {
      throw this.createError(Errors.INVITE_USERS, error);
    }
  }

  /**
   * Verify Matrix devices
   * @param members array of Matrix ids
   * @return {Promise}
   * @throws {ErrorObject}
   */
  private async verifyDevices(members: string[]): Promise<void | never> {
    const memberKeys = await this.matrixClient.downloadKeys(members);

    const verifyRequests = members.reduce((acc, userId) => {
      Object.keys(memberKeys[userId]).forEach((deviceId) => {
        acc.push(this.matrixClient.setDeviceVerified(userId, deviceId));
      });

      return acc;
    }, [] as Promise<void>[]);

    try {
      await Promise.all(verifyRequests);
    } catch (error) {
      throw this.createError(Errors.MEMBERS_VERIFICATION, error);
    }
  }

  /**
   * Initiate Matrix client with user credentials
   * @param username user's login
   * @param password user's password
   * @return {Promise}
   * @throws {ErrorObject}
   */
  private async initClientWithCreds(username: string, password: string): Promise<void | never> {
    try {
      const credentials = this.credentialStorage.getCredentials('username', username);

      const userLoginResult = await this.matrixClient.login('m.login.password', {
        ...(credentials?.deviceId && { device_id: credentials.deviceId }),
        initial_device_display_name: process.env.PRODUCT_NAME,
        identifier: { type: 'm.id.user', user: username },
        password,
      });

      this.matrixClient = await this.createMatrixClient({
        baseUrl: this.baseUrl,
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
          baseUrl: this.baseUrl,
          isLastLogin: true,
        });
      }
    } catch (error) {
      throw this.createError(Errors.INIT_WITH_CREDENTIALS, error);
    }
  }

  /**
   * Initiate Matrix client from storage (cache)
   * @return {Promise}
   * @throws {ErrorObject}
   */
  private async initClientFromCache(): Promise<void | never> {
    const credentials = this.credentialStorage.getCredentials('isLastLogin', true);

    if (!credentials) {
      throw this.createError(Errors.NO_CREDS_IN_DB);
    }

    this.matrixClient = await this.createMatrixClient({
      baseUrl: credentials.baseUrl,
      userId: credentials.userId,
      accessToken: credentials.accessToken,
      deviceId: credentials.deviceId,
    });
  }

  /**
   * Activate event handlers for subscription callbacks
   */
  private subscribeToEvents(): void {
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
        this.subscribeHandlers?.onSyncProgress();
      }
      if (state === SyncState.Prepared) {
        console.info('=== 🔶 Sync prepared');
        this.isClientSynced = true;
        this.subscribeHandlers?.onSyncEnd();
      }
    });
  }

  /**
   * Handle invite event
   * @throws {ErrorObject}
   */
  private handleInviteEvent(): void {
    this.matrixClient.on(RoomMemberEvent.Membership, async (event, member) => {
      if (event.getSender() === this.userId) return;

      const roomId = event.getRoomId();
      const isValidUser = member.userId === this.userId && member.membership === Membership.INVITE;

      if (!isValidUser || !roomId) return;

      try {
        const roomSummary = await this.matrixClient.getRoomSummary(roomId);
        if (!this.isOmniRoom(roomSummary.name)) return;

        const room = this.matrixClient.getRoom(roomId);
        if (!room) return;

        this.subscribeHandlers?.onInvite(
          this.createEventPayload<InvitePayload>(event, {
            content: this.getOmniTopic(room),
            roomName: room.name,
          }),
        );
      } catch (error) {
        console.info('The person who invited you has already left');

        try {
          await this.leaveRoom(roomId);
        } catch (leaveMsg) {
          console.info(leaveMsg);
        }
      }
    });
  }

  /**
   * Handle decrypted events (MST and messages)
   */
  private handleDecryptedEvents(): void {
    this.matrixClient.on(MatrixEventEvent.Decrypted, async (event) => {
      let handler: any = () => {};
      if (this.isMstEvent(event)) {
        const payload = this.createEventPayload<MSTPayload>(event);
        handler = this.subscribeHandlers?.onMstEvent.bind(this, payload);
      }
      if (event.getType() === EventType.RoomMessage) {
        const payload = event.getContent().body;
        handler = this.subscribeHandlers?.onMessage.bind(this, payload);
      }

      const roomId = event.getRoomId();
      if (!roomId) return;

      const room = this.matrixClient.getRoom(roomId);
      if (!room || !this.isOmniRoom(room.name)) return;

      handler();
    });
  }

  /**
   * Handle echo events (init, approve, final, cancel)
   */
  private handleSelfCustomEvents(): void {
    this.matrixClient.on(RoomEvent.LocalEchoUpdated, (event, room) => {
      if (event.getSender() !== this.userId || event.status !== 'sent') return;

      if (!this.isMstEvent(event) || !this.isOmniRoom(room.name)) return;

      this.subscribeHandlers?.onMstEvent(this.createEventPayload<MSTPayload>(event));
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
  private createError(error: Errors, origin?: unknown | never | Error): ErrorObject {
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
   * Verify that user is logged in
   * @throws {ErrorObject}
   */
  private checkClientLoggedIn(): void | never {
    if (!this.matrixClient.isLoggedIn()) {
      throw this.createError(Errors.NOT_LOGGED_IN);
    }
  }

  /**
   * Verify that user is inside room
   * @throws {ErrorObject}
   */
  private checkInsideRoom(): void | never {
    if (!this.activeRoomId) {
      throw this.createError(Errors.OUTSIDE_ROOM);
    }
  }

  /**
   * Create Invite or MST notification payload from Matrix Event
   * @param event matrix event object
   * @param params content and roomName
   * @return {Object}
   */
  private createEventPayload<T extends MSTPayload | InvitePayload>(
    event: MatrixEvent,
    params?: {
      content: OmniExtras;
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
   * Check room name to be an Omni room
   * @param roomName name of the room
   * @return {Boolean}
   */
  private isOmniRoom(roomName?: string): boolean {
    if (!roomName) return false;

    return /^OMNI MST \| [a-zA-Z\d]+$/.test(roomName);
  }

  /**
   * Retrieve omni_extras from room's topic event
   * @param room the room itself
   * @return {Object}
   */
  private getOmniTopic(room: Room): OmniExtras {
    // on invite user only sees stripped state, which has '' as state key for all events
    const strippedStateKey = '';

    const topicEvent = room
      .getLiveTimeline()
      .getState(Direction.Forward)
      .events.get(EventType.RoomTopic)
      ?.get(strippedStateKey)?.event;

    return topicEvent?.content?.omni_extras;
  }

  /**
   * Create Matrix client
   * @param credentials user credentials for Matrix
   * @return {Promise}
   * @throws {ErrorObject}
   */
  private async createMatrixClient(
    credentials: Omit<Credential, 'username' | 'isLastLogin'>,
  ): Promise<MatrixClient | never> {
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
      throw this.createError(Errors.CREATE_MATRIX_CLIENT, error);
    }
  }

  /**
   * Check Mst Event
   * @param event Matrix event
   * @return {Boolean}
   */
  private isMstEvent(event: MatrixEvent): boolean {
    return MST_EVENTS.includes(event.getType() as OmniMstEvents);
  }

  /**
   * Set base url
   * @param url homeserver url
   */
  private setBaseUrl(url: string) {
    this.baseUrl = url;
  }
}
