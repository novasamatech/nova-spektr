import { PropsWithChildren, createContext, useContext, useEffect, useRef, useState } from 'react';

import Matrix, {
  InvitePayload,
  ISecureMessenger,
  MultisigPayload,
  SpektrExtras,
  ApprovePayload,
  UpdatePayload,
  FinalApprovePayload,
  CancelPayload,
  BaseMultisigPayload,
} from '@renderer/services/matrix';
import { MultisigAccount, getMultisigAccountId, createMultisigAccount } from '@renderer/domain/account';
import { useAccount } from '@renderer/services/account/accountService';
import { toAddress } from '@renderer/shared/utils/address';
import { useContact } from '@renderer/services/contact/contactService';
import { getShortAddress } from '@renderer/shared/utils/strings';
import { Address, AccountID, SigningType } from '@renderer/domain/shared-kernel';
import { validateCallData } from '@renderer/shared/utils/substrate';
import { useMultisigTx } from '@renderer/services/multisigTx/multisigTxService';
import {
  MultisigTransaction,
  MultisigTxInitStatus,
  MultisigEvent,
  MultisigTxFinalStatus,
  SigningStatus,
  MultisigTxStatus,
} from '@renderer/domain/transaction';
import { Signatory } from '@renderer/domain/signatory';

type MatrixContextProps = {
  matrix: ISecureMessenger;
  isLoggedIn: boolean;
};

const MatrixContext = createContext<MatrixContextProps>({} as MatrixContextProps);

export const MatrixProvider = ({ children }: PropsWithChildren) => {
  const { getContacts } = useContact();
  const { getMultisigTxs, addMultisigTx, updateMultisigTx } = useMultisigTx();
  const { getAccounts, addAccount, updateAccount } = useAccount();

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
    console.info('💛 ===> onInvite');

    const { roomId, content } = payload;
    const { accountId, threshold, signatories } = content.mstAccount;

    const mstAccountIsValid = accountId === getMultisigAccountId(signatories, threshold);
    if (!mstAccountIsValid) return;

    const accounts = await getAccounts();
    const mstAccount = accounts.find((a) => a.accountId === accountId) as MultisigAccount;
    const signer = accounts.find((a) => signatories.includes(a.accountId));

    if (!mstAccount) {
      await joinRoom(roomId, content);
    } else if (signer) {
      await changeRoom(roomId, mstAccount, content, signer.accountId);
    } else {
      console.warn(`Signer for multisig account ${accountId} not found`);
    }
  };

  const createMstAccount = async (roomId: string, extras: SpektrExtras) => {
    const { signatories, threshold, accountName, creatorAccountId } = extras.mstAccount;

    const contactsMap = (await getContacts()).reduce<Record<AccountID, string>>((acc, contact) => {
      acc[contact.accountId] = contact.name;

      return acc;
    }, {});

    const mstSignatories = signatories.map((accountId) => ({
      accountId,
      name: contactsMap[accountId] || getShortAddress(accountId),
      address: toAddress(accountId),
    }));

    const mstAccount = createMultisigAccount({
      threshold,
      creatorAccountId,
      name: accountName,
      signatories: mstSignatories,
      matrixRoomId: roomId,
    });

    await addAccount(mstAccount);
  };

  const changeRoom = async (
    roomId: string,
    mstAccount: MultisigAccount,
    extras: SpektrExtras,
    signerAccountId: AccountID,
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

  const joinRoom = async (roomId: string, extras: SpektrExtras) => {
    try {
      await matrix.joinRoom(roomId);
      await createMstAccount(roomId, extras);
    } catch (error) {
      console.warn(error);
    }
  };

  const onMultisigEvent = async ({ type, content }: MultisigPayload, extras: SpektrExtras) => {
    console.info('🚀 === onMultisigEvent - ', type);

    if (!validateMatrixEvent(content, extras)) return;

    const multisigAccount = await getMultisigAccount(extras.mstAccount.accountId);
    if (!multisigAccount) return;

    const multisigTxs = await getMultisigTxs({
      accountId: multisigAccount.accountId,
      chainId: content.chainId,
      callHash: content.callHash,
      blockCreated: content.callTimepoint.height,
      indexCreated: content.callTimepoint.index,
    });

    const lastTx = multisigTxs[multisigTxs.length - 1];

    if (matrix.isUpdateEvent(type, content)) {
      await handleUpdateEvent(content, lastTx);
    }
    if (matrix.isCancelEvent(type, content)) {
      await handleCancelEvent(content, multisigAccount, lastTx);
    }
    if (matrix.isApproveEvent(type, content)) {
      await handleApproveEvent(content, multisigAccount, lastTx);
    }
    if (matrix.isFinalApproveEvent(type, content)) {
      await handleFinalApproveEvent(content, multisigAccount, lastTx);
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

  const getMultisigAccount = async (address: Address): Promise<MultisigAccount | undefined> => {
    const accounts = await getAccounts<MultisigAccount>({ signingType: SigningType.MULTISIG });

    return accounts.find((a) => a.accountId === address) as MultisigAccount;
  };

  const createEvent = (payload: ApprovePayload | FinalApprovePayload, eventStatus: SigningStatus): MultisigEvent => {
    const callOutcome = (payload as FinalApprovePayload).callOutcome;

    return {
      status: eventStatus,
      extrinsicHash: payload.extrinsicHash,
      eventBlock: payload.extrinsicTimepoint.height,
      eventIndex: payload.extrinsicTimepoint.index,
      accountId: payload.senderAccountId,
      ...(callOutcome && { multisigOutcome: callOutcome }),
    };
  };

  const addMultisigTxToDB = <T extends BaseMultisigPayload>(
    payload: T,
    accountId: AccountID,
    signatories: Signatory[],
    event: MultisigEvent,
    txStatus: MultisigTxStatus,
  ): Promise<unknown> => {
    const descriptionField = txStatus === 'CANCELLED' ? 'cancelDescription' : 'description';

    return addMultisigTx({
      accountId,
      signatories,
      callHash: payload.callHash,
      callData: payload.callData,
      [descriptionField]: payload.description,
      chainId: payload.chainId,
      events: [event],
      status: txStatus,
      blockCreated: payload.callTimepoint.height,
      indexCreated: payload.callTimepoint.index,
    });
  };

  const handleUpdateEvent = async (payload: UpdatePayload, tx: MultisigTransaction): Promise<void> => {
    if (!tx) return;

    await updateMultisigTx({ ...tx, callData: payload.callData });
  };

  const handleCancelEvent = async (
    payload: CancelPayload,
    { accountId, signatories }: MultisigAccount,
    tx?: MultisigTransaction,
  ): Promise<void> => {
    const eventStatus = payload.error ? 'ERROR_CANCELLED' : 'PENDING_CANCELLED';
    const newEvent = createEvent(payload, eventStatus);

    if (!tx) {
      await addMultisigTxToDB(payload, accountId, signatories, newEvent, MultisigTxFinalStatus.CANCELLED);

      return;
    }

    const senderEvent = tx.events.find((e) => e.accountId === payload.senderAccountId);

    if (!senderEvent) {
      tx.events.push(newEvent);
    } else {
      senderEvent.extrinsicHash = payload.extrinsicHash;
      senderEvent.eventBlock = payload.extrinsicTimepoint.height;
      senderEvent.eventIndex = payload.extrinsicTimepoint.index;

      if (senderEvent.status !== 'CANCELLED') {
        senderEvent.status = eventStatus;
      }
    }

    await updateMultisigTx({ ...tx, status: MultisigTxFinalStatus.CANCELLED });
  };

  const handleApproveEvent = async (
    payload: ApprovePayload,
    { accountId, signatories }: MultisigAccount,
    tx?: MultisigTransaction,
  ): Promise<void> => {
    const eventStatus = payload.error ? 'ERROR_SIGNED' : 'PENDING_SIGNED';
    const newEvent = createEvent(payload, eventStatus);

    if (!tx) {
      await addMultisigTxToDB(payload, accountId, signatories, newEvent, MultisigTxInitStatus.SIGNING);

      return;
    }
    const senderEvent = tx.events.find((e) => e.accountId === payload.senderAccountId);

    if (!senderEvent) {
      tx.events.push(newEvent);
    } else {
      senderEvent.extrinsicHash = payload.extrinsicHash;
      senderEvent.eventBlock = payload.extrinsicTimepoint.height;
      senderEvent.eventIndex = payload.extrinsicTimepoint.index;

      if (senderEvent.status !== 'SIGNED') {
        senderEvent.status = eventStatus;
      }
    }

    await updateMultisigTx(tx);
  };

  const handleFinalApproveEvent = async (
    payload: FinalApprovePayload,
    { accountId, signatories }: MultisigAccount,
    tx?: MultisigTransaction,
  ): Promise<void> => {
    const eventStatus = payload.error ? 'ERROR_SIGNED' : 'PENDING_SIGNED';
    const newEvent = createEvent(payload, eventStatus);

    if (!tx) {
      await addMultisigTxToDB(payload, accountId, signatories, newEvent, payload.callOutcome);

      return;
    }
    const senderEvent = tx.events.find((e) => e.accountId === payload.senderAccountId);

    if (!senderEvent) {
      tx.events.push(newEvent);
    } else {
      senderEvent.extrinsicHash = payload.extrinsicHash;
      senderEvent.eventBlock = payload.extrinsicTimepoint.height;
      senderEvent.eventIndex = payload.extrinsicTimepoint.index;
      senderEvent.multisigOutcome = payload.callOutcome;

      if (senderEvent.status !== 'SIGNED') {
        senderEvent.status = eventStatus;
      }
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
