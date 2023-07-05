import { createContext, PropsWithChildren, useContext, useEffect, useRef, useState } from 'react';

import { createMultisigAccount, getMultisigAccountId, MultisigAccount } from '@renderer/domain/account';
import { useAccount } from '@renderer/services/account/accountService';
import { toAddress } from '@renderer/shared/utils/address';
import { useContact } from '@renderer/services/contact/contactService';
import { AccountId, Address, CallHash, ChainId, SigningType } from '@renderer/domain/shared-kernel';
import { getCreatedDateFromApi, validateCallData } from '@renderer/shared/utils/substrate';
import { useMultisigTx } from '@renderer/services/multisigTx/multisigTxService';
import Matrix, {
  ApprovePayload,
  BaseMultisigPayload,
  CancelPayload,
  FinalApprovePayload,
  InvitePayload,
  ISecureMessenger,
  MultisigPayload,
  SpektrExtras,
  UpdatePayload,
} from '@renderer/services/matrix';
import {
  MultisigEvent,
  MultisigTransaction,
  MultisigTxFinalStatus,
  MultisigTxInitStatus,
  MultisigTxStatus,
  SigningStatus,
} from '@renderer/domain/transaction';
import { Signatory } from '@renderer/domain/signatory';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import { useNotification } from '@renderer/services/notification/notificationService';
import { MultisigNotificationType } from '@renderer/domain/notification';
import { ID, MultisigTransactionDS } from '@renderer/services/storage';
import { useMultisigEvent } from '@renderer/services/multisigEvent/multisigEventService';

type MatrixContextProps = {
  matrix: ISecureMessenger;
  isLoggedIn: boolean;
};

const MatrixContext = createContext<MatrixContextProps>({} as MatrixContextProps);

export const MatrixProvider = ({ children }: PropsWithChildren) => {
  const { getContacts } = useContact();
  const { getMultisigTx, addMultisigTx, updateMultisigTx, updateCallData } = useMultisigTx();
  const { getAccounts, addAccount, updateAccount, setActiveAccount } = useAccount();
  const { decodeCallData } = useTransaction();
  const { connections } = useNetworkContext();
  const { addNotification } = useNotification();
  const { addEvent, updateEvent, getEvents } = useMultisigEvent();

  const connectionsRef = useRef(connections);

  useEffect(() => {
    // HOOK: correct connections for update multisig tx
    connectionsRef.current = connections;
  }, [connections]);

  const { current: matrix } = useRef<ISecureMessenger>(new Matrix());
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const onSyncProgress = () => {
    if (!isLoggedIn) {
      setIsLoggedIn(true);
    }

    console.info('💛 ===> onSyncProgress');
  };

  const onSyncEnd = () => {
    console.info('💛 ===> onSyncEnd');

    matrix.syncSpektrTimeline().catch(console.warn);
  };

  const onMessage = (value: any) => {
    console.info('💛 ===> onMessage - ', value);
  };

  const onInvite = async (payload: InvitePayload) => {
    try {
      console.info('💛 ===> onInvite', payload);

      const { roomId, content, sender } = payload;
      const { accountId, threshold, signatories, accountName, creatorAccountId } = content.mstAccount;

      const mstAccountIsValid = accountId === getMultisigAccountId(signatories, threshold);
      if (!mstAccountIsValid) return;

      const accounts = await getAccounts();
      const mstAccount = accounts.find((a) => a.accountId === accountId) as MultisigAccount;
      const signer = accounts.find((a) => signatories.includes(a.accountId));
      const isActive = sender === matrix.userId;

      if (!mstAccount) {
        await joinRoom(roomId, content, isActive);

        addNotification({
          smpRoomId: roomId,
          multisigAccountId: accountId,
          multisigAccountName: accountName,
          signatories,
          threshold,
          originatorAccountId: creatorAccountId,
          read: true,
          dateCreated: Date.now(),
          type: MultisigNotificationType.ACCOUNT_INVITED,
        });
      } else if (signer) {
        await changeRoom(roomId, mstAccount, content, signer.accountId);
      } else {
        console.warn(`Signer for multisig account ${accountId} not found`);
      }
    } catch (error) {
      console.error(
        'Error processing Multisig invitation',
        payload.roomId,
        payload.eventId,
        payload.roomId,
        payload.roomName,
        error,
      );
    }
  };

  const createMstAccount = async (roomId: string, extras: SpektrExtras, isActive: boolean) => {
    const { signatories, threshold, accountName, creatorAccountId } = extras.mstAccount;

    const contactsMap = (await getContacts()).reduce<Record<AccountId, [Address, string]>>((acc, contact) => {
      acc[contact.accountId] = [contact.address, contact.name];

      return acc;
    }, {});
    const mstSignatories = signatories.map((accountId) => ({
      accountId,
      address: contactsMap[accountId] ? contactsMap[accountId][0] : toAddress(accountId),
      name: contactsMap[accountId] ? contactsMap[accountId][1] : undefined,
    }));

    const mstAccount = createMultisigAccount({
      threshold,
      creatorAccountId,
      name: accountName,
      signatories: mstSignatories,
      matrixRoomId: roomId,
      isActive: false,
    });

    await addAccount(mstAccount).then((id: ID) => {
      if (isActive) {
        setActiveAccount(id);
      }
    });
  };

  const changeRoom = async (
    roomId: string,
    mstAccount: MultisigAccount,
    extras: SpektrExtras,
    signerAccountId: AccountId,
  ) => {
    const { accountName, creatorAccountId } = extras.mstAccount;
    const stayInRoom = signerAccountId > creatorAccountId;

    try {
      if (stayInRoom) {
        await matrix.leaveRoom(roomId);
      } else {
        await matrix.leaveRoom(mstAccount.matrixRoomId);
        await matrix.joinRoom(roomId);
        await updateAccount<MultisigAccount>({
          ...mstAccount,
          name: accountName,
          matrixRoomId: roomId,
          creatorAccountId,
        });
      }
    } catch (error) {
      console.warn(error);
    }
  };

  const joinRoom = async (roomId: string, extras: SpektrExtras, isActive: boolean) => {
    try {
      await matrix.joinRoom(roomId);
      await createMstAccount(roomId, extras, isActive);
    } catch (error) {
      console.error(error);
    }
  };

  const onMultisigEvent = async ({ type, content, sender }: MultisigPayload, extras: SpektrExtras) => {
    console.info('🚀 === onMultisigEvent - ', type, '\n Content: ', content);

    if (!validateMatrixEvent(content, extras)) return;

    const multisigAccount = await getMultisigAccount(extras.mstAccount.accountId);

    if (!multisigAccount) return;

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
    extras: SpektrExtras,
  ): boolean => {
    const { accountId, threshold, signatories } = extras.mstAccount;
    const senderIsSignatory = signatories.some((accountId) => accountId === senderAccountId);
    const mstAccountIsValid = accountId === getMultisigAccountId(signatories, threshold);
    const callDataIsValid = !callData || validateCallData(callData, callHash);

    return senderIsSignatory && mstAccountIsValid && callDataIsValid;
  };

  const getMultisigAccount = async (accountId: AccountId): Promise<MultisigAccount | undefined> => {
    const accounts = await getAccounts<MultisigAccount>({ signingType: SigningType.MULTISIG });

    return accounts.find((a) => a.accountId === accountId) as MultisigAccount;
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

    const api = connectionsRef.current[payload.chainId]?.api;
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
    const { api, addressPrefix } = connectionsRef.current[payload.chainId];

    const dateCreated = api ? await getCreatedDateFromApi(payload.callTimepoint.height, api) : Date.now();
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
    const api = connectionsRef.current[tx.chainId]?.api;

    if (!api || !callData || callData === tx.callData) return;
    console.log(`Updating call data for tx ${tx.callHash}`);
    await updateCallData(api, tx, callData);
  };

  const handleCancelEvent = async (
    payload: CancelPayload,
    { accountId, signatories }: MultisigAccount,
    tx?: MultisigTransactionDS,
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
      await addEvent(newEvent);

      return;
    }

    console.log(`Tx ${payload.callHash} found. Update it`);

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
      await addEvent(newEvent);
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

    if (payload.description && !tx.cancelDescription) {
      console.log(`Update cancel description for tx ${payload.callHash}`);

      tx.cancelDescription = payload.description;
    }

    await updateMultisigTx({ ...tx, status: MultisigTxFinalStatus.CANCELLED });
  };

  const handleApproveEvent = async (
    payload: ApprovePayload,
    { accountId, signatories }: MultisigAccount,
    tx?: MultisigTransactionDS,
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
      await addEvent(newEvent);

      return;
    }
    console.log(`Tx ${payload.callHash} found. Update it`);

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
      await addEvent(newEvent);
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
    if (payload.callData && !tx.callData) {
      console.log(`Update call data for tx ${payload.callHash}`);
      const { api, addressPrefix } = connectionsRef.current[payload.chainId];
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
    tx?: MultisigTransactionDS,
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
      await addEvent(newEvent);

      return;
    }

    console.log(`Tx ${payload.callHash} found. Update it`);

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
      await addEvent(newEvent);
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

    await updateMultisigTx({ ...tx, status: payload.callOutcome });
  };

  const onLogout = () => {
    console.info('🛑 ===> onLogout');
    setIsLoggedIn(false);
  };

  useEffect(() => {
    matrix.setEventCallbacks({
      onSyncProgress,
      onSyncEnd,
      onMessage,
      onInvite,
      onMultisigEvent,
      onLogout,
    });

    matrix.loginFromCache().catch(console.warn);

    return () => {
      matrix.stopClient();
    };
  }, []);

  return <MatrixContext.Provider value={{ matrix, isLoggedIn }}>{children}</MatrixContext.Provider>;
};

export const useMatrix = () => useContext<MatrixContextProps>(MatrixContext);
