import Olm from '@matrix-org/olm';
// @ts-ignore
import olmWasmPath from '@matrix-org/olm/olm.wasm';
import {
  ClientEvent,
  createClient,
  Direction,
  EventType,
  IndexedDBCryptoStore,
  MatrixClient,
  MatrixEvent,
  MatrixEventEvent,
  Preset,
  Room,
  RoomEvent,
  RoomMemberEvent,
  Visibility,
} from 'matrix-js-sdk';
import { SyncState } from 'matrix-js-sdk/lib/sync';
import { uniq } from 'lodash';
import { deriveKey } from 'matrix-js-sdk/lib/crypto/key_passphrase';
import { ISecretStorageKeyInfo } from 'matrix-js-sdk/lib/crypto/api';

import {
  Callbacks,
  InvitePayload,
  ISecureMessenger,
  Membership,
  MstParams,
  MSTPayload,
  OmniExtras,
  OmniMstEvents,
  RoomParams,
  Signatory,
} from './types';
import { BASE_MATRIX_URL, MST_EVENTS, ROOM_CRYPTO_CONFIG, MatrixUserNameRegex } from './constants';

export class Matrix implements ISecureMessenger {
  private static instance: Matrix;

  private matrixClient!: MatrixClient;
  private storage!: any;

  private activeRoomId: string = '';
  private subscribeHandlers?: Callbacks;
  private isClientSynced: boolean = false;
  private isEncryptionActive: boolean = false;

  // TODO: get rid of outer dependency
  constructor(storage: any) {
    if (Matrix.instance) {
      return Matrix.instance;
    }
    Matrix.instance = this;

    this.createDefaultClient();
    this.storage = storage;
  }

  // =====================================================
  // ================= Public methods ====================
  // =====================================================

  /**
   * Initialize Matrix protocol with encryption
   * @return {Promise}
   * @throws {Error}
   */
  async init(): Promise<void | never> {
    if (this.isEncryptionActive) {
      throw this.createError('Encryption has already been initialized');
    }

    try {
      await Olm.init({ locateFile: () => olmWasmPath });
      this.isEncryptionActive = true;
      console.info('=== 🟢 Olm started 🟢 ===');
    } catch (error) {
      throw this.createError('=== 🔴 Olm failed 🔴 ===', error);
    }
  }

  /**
   * Login user to Matrix
   * @param login login value
   * @param password password value
   * @return {Promise}
   * @throws {Error}
   */
  async loginWithCreds(login: string, password: string): Promise<void | never> {
    if (!this.isEncryptionActive) {
      throw this.createError('Encryption has not been initialized');
    }
    if (this.matrixClient.isLoggedIn()) {
      throw this.createError('Client is already logged in');
    }

    try {
      await this.initClientWithCreds(login, password);
      this.subscribeToEvents();
      await this.matrixClient.initCrypto();
      await this.matrixClient.startClient();
      this.matrixClient.setGlobalErrorOnUnknownDevices(false);
    } catch (error) {
      throw this.createError((error as Error).message, error);
    }
  }

  /**
   * Login user to Matrix with cached credentials
   * @return {Promise}
   * @throws {Error}
   */
  async loginFromCache(): Promise<void | never> {
    if (!this.isEncryptionActive) {
      throw this.createError('Encryption has not been initialized');
    }
    if (this.matrixClient.isLoggedIn()) {
      throw this.createError('Client is already logged in');
    }

    try {
      await this.initClientFromCache();
      this.subscribeToEvents();
      await this.matrixClient.initCrypto();
      await this.matrixClient.startClient();
      this.matrixClient.setGlobalErrorOnUnknownDevices(false);
    } catch (error) {
      throw this.createError((error as Error).message, error);
    }
  }

  /**
   * Register user in Matrix
   * @param login login value
   * @param password password value
   * @return {Promise}
   * @throws {Error}
   */
  async registration(login: string, password: string): Promise<void | never> {
    try {
      const auth = { type: 'm.login.omni_matrix_protocol' };
      const data = await this.matrixClient.register(login, password, null, auth, {
        email: false,
      });
      console.log(data);
    } catch (error) {
      throw this.createError('Registration failed', error);
    }
  }

  /**
   * Verify user with Cross signing security key
   * @param securityKey secret user's key
   * @return {Promise}
   * @throws {Error}
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
        await mx.checkOwnCrossSigningTrust();
      }

      return isCorrect;
    } catch (error) {
      throw this.createError('Verification with security key failed', error);
    }
  }

  /**
   * Verify user with Cross signing security phrase
   * @param securityPhrase secret user's phrase
   * @return {Promise}
   * @throws {Error}
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
        await mx.checkOwnCrossSigningTrust();
      }

      return isCorrect;
    } catch (error) {
      throw this.createError('Verification with security phrase failed', error);
    }
  }

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

  /**
   * Stop the client and remove handlers
   * @return {Promise}
   */
  stopClient(): void {
    this.matrixClient.stopClient();
    this.clearSubscribers();
    this.createDefaultClient();
  }

  /**
   * Logout user from Matrix,
   * terminate client,
   * stop synchronization polling
   * @return {Promise}
   * @throws {Error}
   */
  async logout(): Promise<void | never> {
    this.checkClientLoggedIn();

    try {
      this.clearSubscribers();
      this.matrixClient.stopClient();
      await this.matrixClient.logout();
      // await this.matrixClient.clearStores();
      const credentials = await this.storage.mxCredentials.get({
        userId: this.userId,
      });
      if (credentials) {
        await this.storage.mxCredentials.update(credentials, {
          isLoggedIn: false,
        });
      }
      this.createDefaultClient();
    } catch (error) {
      throw this.createError('Logout failed', error);
    }
  }

  /**
   * Start room creation process for new MST account
   * @param mstAccountAddress room configuration
   * @return {Promise}
   * @throws {Error}
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
      throw this.createError((error as Error).message, error);
    }
  }

  /**
   * Finish room creation process for new MST account
   * @param params room configuration
   * @return {Promise}
   * @throws {Error}
   */
  async finishRoomCreation(params: RoomParams): Promise<void | never> {
    this.checkClientLoggedIn();

    try {
      await this.initStateEvents(params);
      await this.inviteSignatories(params.roomId, params.signatories);

      const members = params.signatories.map((signatory) => signatory.matrixAddress);
      await this.verifyDevices(members);
    } catch (error) {
      throw this.createError((error as Error).message, error);
    }
  }

  /**
   * Cancel room creation and leave the room
   * @param roomId room's identifier
   * @return {Promise}
   * @throws {Error}
   */
  async cancelRoomCreation(roomId: string): Promise<void | never> {
    this.checkClientLoggedIn();

    try {
      await this.matrixClient.leave(roomId);
    } catch (error) {
      throw this.createError((error as Error).message, error);
    }
  }

  /**
   * Join existing MST room, skips if already joined
   * @param roomId room's identifier
   * @return {Promise}
   * @throws {Error}
   */
  async joinRoom(roomId: string): Promise<void | never> {
    this.checkClientLoggedIn();

    try {
      await this.matrixClient.joinRoom(roomId);
    } catch (error) {
      throw this.createError(`Failed to join room - ${roomId}`, error);
    }
  }

  /**
   * Leave MST room
   * @param roomId room's identifier
   * @return {Promise}
   * @throws {Error}
   */
  async leaveRoom(roomId: string): Promise<void | never> {
    this.checkClientLoggedIn();

    try {
      await this.matrixClient.leave(roomId);
    } catch (error) {
      throw this.createError(`Failed to leave room - ${roomId}`, error);
    }
  }

  /**
   * Invite signatory to existing MST room
   * @param roomId room's identifier
   * @param signatoryId signatory's identifier
   * @return {Promise}
   * @throws {Error}
   */
  async invite(roomId: string, signatoryId: string): Promise<void | never> {
    this.checkClientLoggedIn();

    try {
      await this.matrixClient.invite(roomId, signatoryId);
    } catch (error) {
      throw this.createError(`Failed to invite - ${signatoryId} to room - ${roomId}`, error);
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
  setRoom(roomId: string): void {
    this.activeRoomId = roomId;
  }

  /**
   * Get live timeline events for all rooms
   * @return {Array}
   * @throws {Error}
   */
  async readTimeline(): Promise<MSTPayload[] | never> {
    let rooms;
    try {
      rooms = (await this.matrixClient.getJoinedRooms()).joined_rooms;
    } catch (error) {
      throw this.createError('Failed to load joined rooms', error);
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
      const timelineToBeRead = timeline.map((event) => this.markAsRead(event));
      await Promise.all(timelineToBeRead);
    } catch (error) {
      throw this.createError('Failed to read the timeline', error);
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
      throw this.createError('Message not sent', error);
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
      throw this.createError('Mark as read failed', error);
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
   * @throws {Error}
   */
  async checkUserExists(userId: string): Promise<boolean | never> {
    if (!this.matrixClient) {
      throw this.createError('Client is not active');
    }

    const username = userId.match(MatrixUserNameRegex);
    if (!username) {
      throw new Error('User ID can only contain characters a-z, 0-9, or =_-./');
    }

    try {
      return await this.matrixClient.isUsernameAvailable(username?.[1]);
    } catch (error) {
      throw this.createError((error as Error).message, error);
    }
  }

  /**
   * Send MST_INIT state event to the room
   * Initialize multi-sig transaction
   * @param params MST parameters
   * @return {Promise}
   * @throws {Error}
   */
  async mstInitiate(params: MstParams): Promise<void | never> {
    this.checkClientLoggedIn();
    this.checkInsideRoom();

    try {
      await this.matrixClient.sendEvent(this.activeRoomId, OmniMstEvents.INIT, params);
    } catch (error) {
      throw this.createError('MST_INIT failed', error);
    }
  }

  /**
   * Send MST_APPROVE state event to the room
   * Approve multi-sig transaction
   * @param params MST parameters
   * @return {Promise}
   * @throws {Error}
   */
  async mstApprove(params: MstParams): Promise<void | never> {
    this.checkClientLoggedIn();
    this.checkInsideRoom();

    try {
      await this.matrixClient.sendEvent(this.activeRoomId, OmniMstEvents.APPROVE, params);
    } catch (error) {
      throw this.createError('MST_APPROVE failed', error);
    }
  }

  /**
   * Send MST_FINAL_APPROVE state event to the room
   * Final approve for multi-sig transaction
   * @param params MST parameters
   * @return {Promise}
   * @throws {Error}
   */
  async mstFinalApprove(params: MstParams): Promise<void | never> {
    this.checkClientLoggedIn();
    this.checkInsideRoom();

    try {
      await this.matrixClient.sendEvent(this.activeRoomId, OmniMstEvents.FINAL_APPROVE, params);
    } catch (error) {
      throw this.createError('MST_FINAL_APPROVE failed', error);
    }
  }

  /**
   * Send MST_CANCEL state event to the room
   * Cancel multi-sig transaction
   * @param params MST parameters
   * @return {Promise}
   * @throws {Error}
   */
  async mstCancel(params: MstParams): Promise<void | never> {
    this.checkClientLoggedIn();
    this.checkInsideRoom();

    try {
      await this.matrixClient.sendEvent(this.activeRoomId, OmniMstEvents.CANCEL, params);
    } catch (error) {
      throw this.createError('MST_CANCEL failed', error);
    }
  }

  // =====================================================
  // ================= Private methods ===================
  // =====================================================

  /**
   * Send encryption and topic events
   * @param params room parameters
   * @return {Promise}
   * @throws {Error}
   */
  private async initStateEvents(params: RoomParams): Promise<void | never> {
    try {
      await this.matrixClient.sendStateEvent(params.roomId, 'm.room.encryption', ROOM_CRYPTO_CONFIG);
    } catch (error) {
      throw this.createError('Failed activating room encryption', error);
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
      throw this.createError("Failed setting room's topic", error);
    }
  }

  /**
   * Invite signatories to Matrix room
   * @param roomId Matrix room Id
   * @param signatories list of signatories' data
   * @return {Promise}
   * @throws {Error}
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
      console.info('=== 🟢 Users invited');
    } catch (error) {
      throw this.createError('Could not invite users', error);
    }
  }

  /**
   * Verify Matrix devices
   * @param members array of Matrix ids
   * @return {Promise}
   * @throws {Error}
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
      console.info('=== 🟢 Devices verified');
    } catch (error) {
      throw this.createError('Could not verify devices', error);
    }
  }

  /**
   * Initiate Matrix client with user credentials
   * @param username user's login
   * @param password user's password
   * @return {Promise}
   * @throws {Error}
   */
  private async initClientWithCreds(username: string, password: string): Promise<void | never> {
    const credentials = await this.storage.mxCredentials.get({ username });
    const userLoginResult = await this.matrixClient.login('m.login.password', {
      ...(credentials?.deviceId && { device_id: credentials.deviceId }),
      initial_device_display_name: process.env.PRODUCT_NAME,
      identifier: { type: 'm.id.user', user: username },
      password,
    });

    this.matrixClient = createClient({
      baseUrl: BASE_MATRIX_URL,
      userId: userLoginResult.user_id,
      accessToken: userLoginResult.access_token,
      deviceId: credentials?.deviceId || userLoginResult.device_id,
      cryptoStore: new IndexedDBCryptoStore(window.indexedDB, 'matrix'),
    });

    if (credentials) {
      await this.storage.mxCredentials.update(credentials, {
        accessToken: userLoginResult.access_token,
        isLoggedIn: true,
      });
    } else {
      await this.storage.mxCredentials.add({
        username,
        userId: userLoginResult.user_id,
        accessToken: userLoginResult.access_token,
        deviceId: userLoginResult.device_id,
        isLoggedIn: true,
      });
    }
  }

  /**
   * Initiate Matrix client from storage (cache)
   * @return {Promise}
   * @throws {Error}
   */
  private async initClientFromCache(): Promise<void | never> {
    const credentials = await this.storage.mxCredentials.get({
      isLoggedIn: true,
    });

    if (!credentials) {
      throw new Error('No credentials in DataBase');
    }

    this.matrixClient = createClient({
      baseUrl: BASE_MATRIX_URL,
      userId: credentials.userId,
      accessToken: credentials.accessToken,
      deviceId: credentials.deviceId,
      cryptoStore: new IndexedDBCryptoStore(window.indexedDB, 'matrix'),
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
   * @throws {Error}
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
   * Create error object with a provided message
   * @param message error's message value
   * @param error optional error object
   * @return {Error}
   */
  private createError(message: string, error?: unknown): Error {
    const typedError = error instanceof Error ? error : new Error('Error: ', { cause: error as Error });

    return new Error(`🔶 Matrix: ${message} 🔶`, { cause: typedError });
  }

  /**
   * Verify that user is logged in
   * @param message error's message value
   * @throws {Error}
   */
  private checkClientLoggedIn(message?: string): void | never {
    if (!this.matrixClient.isLoggedIn()) {
      const throwMsg = message ? `🔶 ${message} 🔶` : '🔶 Matrix client is not logged in 🔶';
      throw new Error(throwMsg);
    }
  }

  /**
   * Verify that user is inside room
   * @param message error's message value
   * @throws {Error}
   */
  private checkInsideRoom(message?: string): void | never {
    if (!this.activeRoomId) {
      const throwMsg = message ? `🔶 ${message} 🔶` : '🔶 Matrix client is outside of room 🔶';
      throw new Error(throwMsg);
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
   * Set default Matrix client to be able to make requests like "isUsernameAvailable"
   */
  private createDefaultClient() {
    this.matrixClient = createClient(BASE_MATRIX_URL);
  }

  /**
   * Check Mst Event
   * @param event Matrix event
   * @return {Boolean}
   */
  private isMstEvent(event: MatrixEvent): boolean {
    return MST_EVENTS.includes(event.getType() as OmniMstEvents);
  }
}
