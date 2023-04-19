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
import { MultisigAccount, getMultisigAddress, createMultisigAccount } from '@renderer/domain/account';
import { useAccount } from '@renderer/services/account/accountService';
import { formatAddress, toPublicKey } from '@renderer/shared/utils/address';
import { useContact } from '@renderer/services/contact/contactService';
import { getShortAddress } from '@renderer/shared/utils/strings';
import { AccountID, PublicKey, SigningType } from '@renderer/domain/shared-kernel';
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
import { useNetworkContext } from '@renderer/context/NetworkContext';

type MatrixContextProps = {
  matrix: ISecureMessenger;
  isLoggedIn: boolean;
};

const MatrixContext = createContext<MatrixContextProps>({} as MatrixContextProps);

export const MatrixProvider = ({ children }: PropsWithChildren) => {
  const { getContacts } = useContact();
  const { getMultisigTxs, addMultisigTx, updateMultisigTx, updateCallData } = useMultisigTx();
  const { getAccounts, addAccount, updateAccount } = useAccount();
  const { connections } = useNetworkContext();

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
    // TODO: request all unread events
    // try {
    //   await matrix.syncSpektrTimeline();
    // } catch (error) {
    //   console.log(error);
    // }
  };

  const onMessage = (value: any) => {
    console.info('💛 ===> onMessage - ', value);
  };

  const onInvite = async (payload: InvitePayload) => {
    console.info('💛 ===> onInvite');

    const { roomId, content } = payload;
    const { address, threshold, signatories } = content.mst_account;

    const mstAccountIsValid = address === getMultisigAddress(signatories, threshold);
    if (!mstAccountIsValid) return;

    const accounts = await getAccounts();
    const signatoryPublicKeys = signatories.map(toPublicKey);
    const mstAccount = accounts.find((a) => a.accountId === address) as MultisigAccount;
    const signer = accounts.find((a) => signatoryPublicKeys.includes(toPublicKey(a.accountId)));
    if (mstAccount) {
      await changeRoom(roomId, mstAccount, content, signer?.accountId);
    } else {
      await joinRoom(roomId, content);
    }
  };

  const createMstAccount = async (roomId: string, extras: SpektrExtras) => {
    const { signatories, threshold, accountName, inviterPublicKey } = extras.mst_account;

    const contacts = await getContacts();
    const mstSignatories = signatories.map((accountId) => {
      const match = contacts.find((c) => c.publicKey === toPublicKey(accountId));

      return {
        accountId,
        name: match?.name || getShortAddress(accountId),
        publicKey: toPublicKey(accountId) || '0x',
      };
    });

    const mstAccount = createMultisigAccount({
      name: accountName,
      signatories: mstSignatories,
      threshold,
      inviterPublicKey,
      matrixRoomId: roomId,
    });

    await addAccount(mstAccount);
  };

  const changeRoom = async (
    roomId: string,
    mstAccount: MultisigAccount,
    extras: SpektrExtras,
    signerAddress?: AccountID,
  ) => {
    const { accountName, inviterPublicKey } = extras.mst_account;
    const stayInRoom = formatAddress(signerAddress) > formatAddress(inviterPublicKey);

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
          inviterPublicKey,
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

    const multisigAccount = await getMultisigAccount(extras.mst_account.address);
    if (!multisigAccount) return;

    const multisigTxs = await getMultisigTxs({
      publicKey: multisigAccount.publicKey,
      chainId: content.chainId,
      callHash: content.callHash,
      blockCreated: content.callTimepoint.height,
      indexCreated: content.callTimepoint.index,
    });

    // TODO: check that really can be more than 1 task with same accountId, callHash and timepoint
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
    { callData, callHash, senderAddress }: T,
    extras: SpektrExtras,
  ): boolean => {
    const { address, threshold, signatories } = extras.mst_account;
    const senderIsSignatory = signatories.some((s) => toPublicKey(s) === toPublicKey(senderAddress));
    const mstAccountIsValid = address === getMultisigAddress(signatories, threshold);
    const callDataIsValid = !callData || validateCallData(callData, callHash);

    return senderIsSignatory && mstAccountIsValid && callDataIsValid;
  };

  const getMultisigAccount = async (address: AccountID): Promise<MultisigAccount | undefined> => {
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
      accountId: toPublicKey(payload.senderAddress) || '0x0',
      ...(callOutcome && { multisigOutcome: callOutcome }),
    };
  };

  const addMultisigTxToDB = <T extends BaseMultisigPayload>(
    payload: T,
    publicKey: PublicKey,
    signatories: Signatory[],
    event: MultisigEvent,
    txStatus: MultisigTxStatus,
  ): Promise<unknown> => {
    const descriptionField = txStatus === 'CANCELLED' ? 'cancelDescription' : 'description';

    return addMultisigTx({
      publicKey,
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

  const handleUpdateEvent = async ({ callData }: UpdatePayload, tx: MultisigTransaction): Promise<void> => {
    if (!tx) return;

    const api = connectionsRef.current[tx.chainId]?.api;

    if (!api || !callData || callData === tx.callData) return;

    await updateCallData(api, tx, callData);
  };

  const handleCancelEvent = async (
    payload: CancelPayload,
    { publicKey, signatories }: MultisigAccount,
    tx?: MultisigTransaction,
  ): Promise<void> => {
    const eventStatus = payload.error ? 'ERROR_CANCELLED' : 'PENDING_CANCELLED';
    const newEvent = createEvent(payload, eventStatus);

    if (!tx) {
      await addMultisigTxToDB(payload, publicKey, signatories, newEvent, MultisigTxFinalStatus.CANCELLED);

      return;
    }

    const senderEvent = tx.events.find((e) => e.accountId === toPublicKey(payload.senderAddress));

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
    { publicKey, signatories }: MultisigAccount,
    tx?: MultisigTransaction,
  ): Promise<void> => {
    const eventStatus = payload.error ? 'ERROR_SIGNED' : 'PENDING_SIGNED';
    const newEvent = createEvent(payload, eventStatus);

    if (!tx) {
      await addMultisigTxToDB(payload, publicKey, signatories, newEvent, MultisigTxInitStatus.SIGNING);

      return;
    }
    const senderEvent = tx.events.find((e) => e.accountId === toPublicKey(payload.senderAddress));

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
    { publicKey, signatories }: MultisigAccount,
    tx?: MultisigTransaction,
  ): Promise<void> => {
    const eventStatus = payload.error ? 'ERROR_SIGNED' : 'PENDING_SIGNED';
    const newEvent = createEvent(payload, eventStatus);

    if (!tx) {
      await addMultisigTxToDB(payload, publicKey, signatories, newEvent, payload.callOutcome);

      return;
    }
    const senderEvent = tx.events.find((e) => e.accountId === toPublicKey(payload.senderAddress));

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
