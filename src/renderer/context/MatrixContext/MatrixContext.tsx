import { PropsWithChildren, createContext, useContext, useEffect, useRef, useState } from 'react';

import Matrix, {
  InvitePayload,
  ISecureMessenger,
  MultisigPayload,
  SpektrExtras,
  UpdatePayload,
  BaseMultisigPayload,
} from '@renderer/services/matrix';
import { MultisigAccount, getMultisigAddress, createMultisigAccount } from '@renderer/domain/account';
import { useAccount } from '@renderer/services/account/accountService';
import { formatAddress, toPublicKey } from '@renderer/shared/utils/address';
import { useContact } from '@renderer/services/contact/contactService';
import { getShortAddress } from '@renderer/shared/utils/strings';
import { AccountID, SigningType } from '@renderer/domain/shared-kernel';
import { validateCallData } from '@renderer/shared/utils/substrate';
import { useMultisigTx } from '@renderer/services/multisigTx/multisigTxService';
import { MultisigTransaction } from '@renderer/domain/transaction';

type MatrixContextProps = {
  matrix: ISecureMessenger;
  isLoggedIn: boolean;
};

const MatrixContext = createContext<MatrixContextProps>({} as MatrixContextProps);

export const MatrixProvider = ({ children }: PropsWithChildren) => {
  const { getContacts } = useContact();
  const { getMultisigTxs, updateMultisigTx } = useMultisigTx();
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

    const multisigAccount = await getMultisigAccount(address);
    if (multisigAccount) {
      await changeRoom(roomId, multisigAccount, content);
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

  const changeRoom = async (roomId: string, mstAccount: MultisigAccount, extras: SpektrExtras) => {
    const { accountName, inviterPublicKey } = extras.mst_account;
    const stayInRoom = formatAddress(mstAccount.accountId) > formatAddress(inviterPublicKey);
    if (stayInRoom) return;

    try {
      await matrix.leaveRoom(mstAccount.matrixRoomId);
      await matrix.joinRoom(roomId);
      await updateAccount<MultisigAccount>({
        ...mstAccount,
        name: accountName,
        matrixRoomId: roomId,
        inviterPublicKey,
      });
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
    console.log('🚀 === onMultisigEvent - ', type);

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

    const lastTx = multisigTxs[multisigTxs.length - 1];

    if (matrix.isUpdateEvent(type, content)) {
      await handleUpdateEvent(content, lastTx);
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

  const handleUpdateEvent = async (payload: UpdatePayload, tx: MultisigTransaction): Promise<void> => {
    if (!tx) return;

    await updateMultisigTx({ ...tx, callData: payload.callData });
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
