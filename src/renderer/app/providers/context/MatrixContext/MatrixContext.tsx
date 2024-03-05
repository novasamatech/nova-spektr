import { PropsWithChildren, useEffect, useRef, createContext } from 'react';
import { useUnit } from 'effector-react';

import { getCreatedDateFromApi, toAddress, validateCallData } from '@shared/lib/utils';
import { useMultisigEvent, useMultisigTx } from '@entities/multisig';
import { useMultisigChainContext } from '@app/providers';
import { contactModel } from '@entities/contact';
import { walletModel, accountUtils } from '@entities/wallet';
import { networkModel } from '@entities/network';
import { notificationModel } from '@entities/notification';
import {
  Signatory,
  MultisigAccount,
  AccountId,
  Address,
  CallHash,
  ChainId,
  NotificationType,
  WalletType,
  SigningType,
  CryptoType,
  ChainType,
  AccountType,
  MultisigInvite,
  NoID,
} from '@shared/core';
import {
  ApprovePayload,
  BaseMultisigPayload,
  CancelPayload,
  FinalApprovePayload,
  InvitePayload,
  MultisigPayload,
  SpektrExtras,
  UpdatePayload,
} from '@shared/api/matrix';
import {
  MultisigEvent,
  MultisigTransaction,
  MultisigTxFinalStatus,
  MultisigTxInitStatus,
  MultisigTxStatus,
  SigningStatus,
  useTransaction,
} from '@entities/transaction';
import { matrixModel, LoginStatus } from '@entities/matrix';
import { matrixAutologinModel } from '@features/matrix';

const MatrixContext = createContext({});

export const MatrixProvider = ({ children }: PropsWithChildren) => {
  const matrix = useUnit(matrixModel.$matrix);

  const contacts = useUnit(contactModel.$contacts);
  const accounts = useUnit(walletModel.$accounts);
  const chains = useUnit(networkModel.$chains);
  const apis = useUnit(networkModel.$apis);

  const { addTask } = useMultisigChainContext();
  const { getMultisigTx, addMultisigTx, updateMultisigTx, updateCallData } = useMultisigTx({ addTask });
  const { decodeCallData } = useTransaction();
  const { addEventWithQueue, updateEvent, getEvents } = useMultisigEvent({ addTask });

  const apisRef = useRef(apis);
  const accountsRef = useRef(accounts);

  // HOOK: correct connections for update multisig tx
  useEffect(() => {
    apisRef.current = apis;
  }, [apis]);

  // HOOK: correct accounts for update multisig tx
  useEffect(() => {
    accountsRef.current = accounts;
  }, [accounts]);

  const onSyncEnd = () => {
    console.info('💛 ===> Matrix: sync end');

    matrix.syncSpektrTimeline().catch(console.warn);
  };

  const onInvite = async (payload: InvitePayload) => {
    console.info('💛 ===> Matrix: Multisig invite', payload);

    const { roomId, content } = payload;
    const { accountId, threshold, signatories, accountName, creatorAccountId } = content.mstAccount;

    try {
      validateMstAccount(accountId, signatories, threshold);

      const mstAccount = accounts.find((a) => a.accountId === accountId) as MultisigAccount;

      if (!mstAccount) {
        console.log(`No multisig account ${accountId} found. Joining room and adding wallet`);

        await joinRoom(roomId, content);

        notificationModel.events.notificationsAdded([
          {
            smpRoomId: roomId,
            multisigAccountId: accountId,
            multisigAccountName: accountName,
            signatories,
            threshold,
            originatorAccountId: creatorAccountId,
            read: true,
            dateCreated: Date.now(),
            type: NotificationType.MULTISIG_INVITE,
          },
        ] as NoID<MultisigInvite>[]);
      } else {
        console.log(`Multisig account ${accountId} already exists. Trying to change room to ${roomId}`);
        await changeRoom(roomId, mstAccount, content, creatorAccountId);
      }
    } catch (error) {
      console.error(
        'Error processing Multisig invitation',
        payload.sender,
        payload.roomName,
        payload.roomId,
        payload.eventId,
        error,
      );
      await matrix.leaveRoom(roomId);
    }
  };

  const validateMstAccount = (accountId: AccountId, signatories: AccountId[], threshold: number) => {
    const isValid = accountId === accountUtils.getMultisigAccountId(signatories, threshold);

    if (!isValid) {
      throw new Error(`Multisig address ${accountId} can't be derived from signatories and threshold`);
    }
  };

  const createMstAccount = (roomId: string, extras: SpektrExtras) => {
    const { signatories, threshold, accountName, creatorAccountId } = extras.mstAccount;

    const contactsMap = contacts.reduce<Record<AccountId, [Address, string]>>((acc, contact) => {
      acc[contact.accountId] = [contact.address, contact.name];

      return acc;
    }, {});

    const mstSignatories = signatories.map((accountId) => ({
      accountId,
      address: contactsMap[accountId]?.[0] || toAddress(accountId),
      name: contactsMap[accountId]?.[1],
    }));

    walletModel.events.multisigCreated({
      wallet: {
        name: accountName,
        type: WalletType.MULTISIG,
        signingType: SigningType.MULTISIG,
      },
      accounts: [
        {
          threshold,
          creatorAccountId,
          accountId: accountUtils.getMultisigAccountId(signatories, threshold),
          signatories: mstSignatories,
          name: accountName,
          matrixRoomId: roomId,
          cryptoType: CryptoType.SR25519,
          chainType: ChainType.SUBSTRATE,
          type: AccountType.MULTISIG,
        },
      ],
    });
  };

  const changeRoom = async (
    roomId: string,
    mstAccount: MultisigAccount,
    extras: SpektrExtras,
    newRoomCreatorAccountId: AccountId,
  ) => {
    const { accountName, creatorAccountId } = extras.mstAccount;
    const stayInRoom = newRoomCreatorAccountId > creatorAccountId;

    try {
      if (stayInRoom) {
        console.log(`Skip invitation from room ${roomId}`);
        await matrix.leaveRoom(roomId);
      } else {
        console.log(`Leave old ${mstAccount.matrixRoomId}, join new room ${roomId}`);
        if (mstAccount.matrixRoomId) {
          await matrix.leaveRoom(mstAccount.matrixRoomId);
        }

        await matrix.joinRoom(roomId);

        walletModel.events.multisigAccountUpdated({
          id: mstAccount.id,
          name: accountName,
          matrixRoomId: roomId,
          creatorAccountId,
        });
      }
    } catch (error) {
      console.warn(error);
    }
  };

  const joinRoom = async (roomId: string, extras: SpektrExtras): Promise<void> => {
    try {
      await matrix.joinRoom(roomId);
      createMstAccount(roomId, extras);
    } catch (error) {
      console.error(error);
    }
  };

  const onMultisigEvent = async ({ type, content, sender }: MultisigPayload, extras: SpektrExtras | undefined) => {
    console.info('🚀 === onMultisigEvent - ', type, '\n Content: ', content);

    if (!validateMatrixEvent(content, extras)) return;

    const multisigAccount = accountsRef.current.find((a) => a.accountId === extras?.mstAccount.accountId);
    if (!multisigAccount || !accountUtils.isMultisigAccount(multisigAccount)) return;

    const multisigTx = await getMultisigTx(
      multisigAccount.accountId,
      content.chainId,
      content.callHash,
      content.callTimepoint.height,
      content.callTimepoint.index,
    );

    if (matrix.isUpdateEvent(type, content)) {
      await handleUpdateEvent(content, multisigTx);
    }
    if (matrix.isCancelEvent(type, content)) {
      await handleCancelEvent(content, multisigAccount, multisigTx);
    }
    if (matrix.isApproveEvent(type, content)) {
      await handleApproveEvent(content, multisigAccount, multisigTx);
    }
    if (matrix.isFinalApproveEvent(type, content)) {
      await handleFinalApproveEvent(content, multisigAccount, multisigTx);
    }
  };

  const validateMatrixEvent = <T extends BaseMultisigPayload>(
    { callData, callHash, senderAccountId }: T,
    extras: SpektrExtras | undefined,
  ): boolean => {
    if (!extras) return false;

    const { accountId, threshold, signatories } = extras.mstAccount;
    const senderIsSignatory = signatories.some((accountId) => accountId === senderAccountId);
    const mstAccountIsValid = accountId === accountUtils.getMultisigAccountId(signatories, threshold);
    const callDataIsValid = !callData || validateCallData(callData, callHash);

    return senderIsSignatory && mstAccountIsValid && callDataIsValid;
  };

  const createEvent = async (
    payload: ApprovePayload | FinalApprovePayload,
    eventStatus: SigningStatus,
    txAccountId: AccountId,
    txChainId: ChainId,
    txCallHash: CallHash,
    txBlock: number,
    txIndex: number,
  ): Promise<MultisigEvent> => {
    const callOutcome = (payload as FinalApprovePayload).callOutcome;

    const api = apisRef.current[payload.chainId];
    const dateCreated = api ? await getCreatedDateFromApi(payload.extrinsicTimepoint.height, api) : Date.now();

    return {
      txAccountId,
      txChainId,
      txCallHash,
      txBlock,
      txIndex,
      status: eventStatus,
      extrinsicHash: payload.extrinsicHash,
      eventBlock: payload.extrinsicTimepoint.height,
      eventIndex: payload.extrinsicTimepoint.index,
      accountId: payload.senderAccountId,
      dateCreated,
      ...(callOutcome && { multisigOutcome: callOutcome }),
    };
  };

  const addMultisigTxToDB = async <T extends BaseMultisigPayload>(
    payload: T,
    accountId: AccountId,
    signatories: Signatory[],
    txStatus: MultisigTxStatus,
  ): Promise<void> => {
    const descriptionField = txStatus === MultisigTxFinalStatus.CANCELLED ? 'cancelDescription' : 'description';
    const api = apisRef.current[payload.chainId];
    const addressPrefix = chains[payload.chainId]?.addressPrefix;
    const dateCreated = api && (await getCreatedDateFromApi(payload.callTimepoint.height, api));

    if (!api) {
      console.warn(`No api found for ${payload.chainId} can't decode call data for ${payload.callHash}`);
    }
    if (!addressPrefix) {
      console.warn(`No addressPrefix found for ${payload.chainId} can't decode call data for ${payload.callHash}`);
    }

    const transaction =
      api && payload.callData && decodeCallData(api, toAddress(accountId, { prefix: addressPrefix }), payload.callData);

    await addMultisigTx({
      accountId,
      signatories,
      callHash: payload.callHash,
      callData: payload.callData,
      [descriptionField]: payload.description,
      chainId: payload.chainId,
      status: txStatus,
      blockCreated: payload.callTimepoint.height,
      indexCreated: payload.callTimepoint.index,
      dateCreated,
      transaction,
    });
  };

  const handleUpdateEvent = async ({ callData }: UpdatePayload, tx?: MultisigTransaction): Promise<void> => {
    if (!tx) return;
    console.log(`Start update call data for tx ${tx.callHash}`);
    const api = apisRef.current[tx.chainId];

    if (!api || !callData || callData === tx.callData) return;
    console.log(`Updating call data for tx ${tx.callHash}`);
    await updateCallData(api, tx, callData);
  };

  const handleCancelEvent = async (
    payload: CancelPayload,
    { accountId, signatories }: MultisigAccount,
    tx?: MultisigTransaction,
  ): Promise<void> => {
    console.log(
      `Start processing cancelling for tx ${payload.callHash} and timepoint ${payload.callTimepoint.height}-${payload.callTimepoint.index}`,
    );

    const eventStatus = payload.error ? 'ERROR_CANCELLED' : 'CANCELLED';
    const newEvent = await createEvent(
      payload,
      eventStatus,
      accountId,
      payload.chainId,
      payload.callHash,
      payload.extrinsicTimepoint.height,
      payload.extrinsicTimepoint.index,
    );

    if (!tx) {
      console.log(`Tx ${payload.callHash} not found. Create it`);

      await addMultisigTxToDB(payload, accountId, signatories, MultisigTxFinalStatus.CANCELLED);
      await addEventWithQueue(newEvent);

      return;
    }

    console.log(`Tx ${payload.callHash} found. Update it`);

    // TODO: refactor with pending statuses for addEventWithQueue
    addTask(async () => {
      const events = await getEvents({
        txAccountId: tx.accountId,
        txChainId: tx.chainId,
        txCallHash: tx.callHash,
        txBlock: tx.blockCreated,
        txIndex: tx.indexCreated,
      });

      const senderEvent = events.find(
        (e) => e.accountId === payload.senderAccountId && ['PENDING_CANCELLED', 'CANCELLED'].includes(e.status),
      );

      if (!senderEvent) {
        await addEventWithQueue(newEvent);
      } else {
        senderEvent.extrinsicHash = payload.extrinsicHash;
        senderEvent.eventBlock = payload.extrinsicTimepoint.height;
        senderEvent.eventIndex = payload.extrinsicTimepoint.index;

        if (!senderEvent.dateCreated) {
          senderEvent.dateCreated = newEvent.dateCreated;
        }

        if (senderEvent.status !== 'CANCELLED') {
          senderEvent.status = eventStatus;
        }

        await updateEvent(senderEvent);
      }
    });

    if (payload.description && !tx.cancelDescription) {
      console.log(`Update cancel description for tx ${payload.callHash}`);

      tx.cancelDescription = payload.description;
    }

    await updateMultisigTx({ ...tx, status: MultisigTxFinalStatus.CANCELLED });
  };

  const handleApproveEvent = async (
    payload: ApprovePayload,
    { accountId, signatories }: MultisigAccount,
    tx?: MultisigTransaction,
  ): Promise<void> => {
    console.log(
      `Start processing approval for tx ${payload.callHash} and timepoint ${payload.callTimepoint.height}-${payload.callTimepoint.index}`,
    );
    const eventStatus = payload.error ? 'ERROR_SIGNED' : 'SIGNED';
    const newEvent = await createEvent(
      payload,
      eventStatus,
      accountId,
      payload.chainId,
      payload.callHash,
      payload.extrinsicTimepoint.height,
      payload.extrinsicTimepoint.index,
    );

    if (!tx) {
      console.log(`Tx ${payload.callHash} not found. Create it`);

      await addMultisigTxToDB(payload, accountId, signatories, MultisigTxInitStatus.SIGNING);
      await addEventWithQueue(newEvent, ['PENDING_SIGNED', 'SIGNED']);

      return;
    }
    console.log(`Tx ${payload.callHash} found. Update it`);

    // TODO: refactor with pending statuses for addEventWithQueue
    addTask(async () => {
      const events = await getEvents({
        txAccountId: tx.accountId,
        txChainId: tx.chainId,
        txCallHash: tx.callHash,
        txBlock: tx.blockCreated,
        txIndex: tx.indexCreated,
      });

      const senderEvent = events.find(
        (e) => e.accountId === payload.senderAccountId && ['PENDING_SIGNED', 'SIGNED'].includes(e.status),
      );

      if (!senderEvent) {
        await addEventWithQueue(newEvent);
      } else {
        senderEvent.extrinsicHash = payload.extrinsicHash;
        senderEvent.eventBlock = payload.extrinsicTimepoint.height;
        senderEvent.eventIndex = payload.extrinsicTimepoint.index;
        if (!senderEvent.dateCreated) {
          senderEvent.dateCreated = newEvent.dateCreated;
        }

        if (senderEvent.status !== 'SIGNED') {
          senderEvent.status = eventStatus;
        }

        await updateEvent(senderEvent);
      }
    });

    if (payload.callData && !tx.callData) {
      console.log(`Update call data for tx ${payload.callHash}`);
      const api = apisRef.current[payload.chainId];
      const addressPrefix = chains[payload.chainId]?.addressPrefix;

      if (!api) {
        console.warn(`No api found for ${payload.chainId} can't decode call data for ${payload.callHash}`);
      }
      if (!addressPrefix) {
        console.warn(`No addressPrefix found for ${payload.chainId} can't decode call data for ${payload.callHash}`);
      }

      const transaction =
        api &&
        payload.callData &&
        decodeCallData(api, toAddress(accountId, { prefix: addressPrefix }), payload.callData);

      tx.callData = payload.callData;
      tx.transaction = transaction;
    }
    if (payload.description && !tx.description) {
      console.log(`Update description for tx ${payload.callHash}`);
      tx.description = payload.description;
    }

    await updateMultisigTx(tx);
  };

  const handleFinalApproveEvent = async (
    payload: FinalApprovePayload,
    { accountId, signatories }: MultisigAccount,
    tx?: MultisigTransaction,
  ): Promise<void> => {
    console.log(
      `Start processing final approval for tx ${payload.callHash} and timepoint ${payload.callTimepoint.height}-${payload.callTimepoint.index} and outcome ${payload.callOutcome}`,
    );

    const eventStatus = payload.error ? 'ERROR_SIGNED' : 'SIGNED';
    const newEvent = await createEvent(
      payload,
      eventStatus,
      accountId,
      payload.chainId,
      payload.callHash,
      payload.extrinsicTimepoint.height,
      payload.extrinsicTimepoint.index,
    );

    if (!tx) {
      console.log(`Tx ${payload.callHash} not found. Create it`);

      await addMultisigTxToDB(payload, accountId, signatories, payload.callOutcome);
      await addEventWithQueue(newEvent);

      return;
    }

    console.log(`Tx ${payload.callHash} found. Update it`);

    // TODO: Refactor with pending statuses for addEventWithQueue
    addTask(async () => {
      const events = await getEvents({
        txAccountId: tx.accountId,
        txChainId: tx.chainId,
        txCallHash: tx.callHash,
        txBlock: tx.blockCreated,
        txIndex: tx.indexCreated,
      });
      const senderEvent = events.find(
        (e) => e.accountId === payload.senderAccountId && ['PENDING_SIGNED', 'SIGNED'].includes(e.status),
      );

      if (!senderEvent) {
        await addEventWithQueue(newEvent);
      } else {
        senderEvent.extrinsicHash = payload.extrinsicHash;
        senderEvent.eventBlock = payload.extrinsicTimepoint.height;
        senderEvent.eventIndex = payload.extrinsicTimepoint.index;
        senderEvent.multisigOutcome = payload.callOutcome;
        if (!senderEvent.dateCreated) {
          senderEvent.dateCreated = newEvent.dateCreated;
        }

        if (senderEvent.status !== 'SIGNED') {
          senderEvent.status = eventStatus;
        }

        await updateEvent(senderEvent);
      }
    });

    await updateMultisigTx({ ...tx, status: payload.callOutcome });
  };

  const onLogout = () => {
    console.info('🛑 ===> Matrix: on logout');

    matrixModel.events.loginStatusChanged(LoginStatus.LOGGED_OUT);
  };

  useEffect(() => {
    matrix.setEventCallbacks({ onInvite, onSyncEnd, onMultisigEvent, onLogout });

    return () => {
      matrix.stopClient();
    };
  }, []);

  useEffect(() => {
    matrixAutologinModel.events.loggedInFromCache();

    const token = new URLSearchParams(window.location.search).get('loginToken');
    if (token) {
      matrixAutologinModel.events.loggedInWithToken(token);
    }
  }, []);

  return <MatrixContext.Provider value={{}}>{children}</MatrixContext.Provider>;
};
