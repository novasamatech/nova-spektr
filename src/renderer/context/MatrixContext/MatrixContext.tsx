import { PropsWithChildren, createContext, useContext, useEffect, useRef, useState } from 'react';

import Matrix, { InvitePayload, ISecureMessenger, MSTPayload, SpektrExtras } from '@renderer/services/matrix';
import { MultisigAccount, getMultisigAddress, createMultisigAccount } from '@renderer/domain/account';
import { useAccount } from '@renderer/services/account/accountService';
import { formatAddress, toPublicKey } from '@renderer/shared/utils/address';
import { useContact } from '@renderer/services/contact/contactService';
import { getShortAddress } from '@renderer/shared/utils/strings';
import { AccountID } from '@renderer/domain/shared-kernel';

type MatrixContextProps = {
  matrix: ISecureMessenger;
  isLoggedIn: boolean;
};

const MatrixContext = createContext<MatrixContextProps>({} as MatrixContextProps);

export const MatrixProvider = ({ children }: PropsWithChildren) => {
  const { getAccounts, addAccount, updateAccount } = useAccount();
  const { getContacts } = useContact();

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

  const createMstAccount = async (roomId: string, content: SpektrExtras) => {
    const { signatories, threshold, accountName, inviterPublicKey } = content.mst_account;

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
    content: SpektrExtras,
    signerAddress?: AccountID,
  ) => {
    const { accountName, inviterPublicKey } = content.mst_account;
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

  const joinRoom = async (roomId: string, content: SpektrExtras) => {
    try {
      await matrix.joinRoom(roomId);
      await createMstAccount(roomId, content);
    } catch (error) {
      console.warn(error);
    }
  };

  const onMstEvent = (eventData: MSTPayload) => {
    console.info('💛 ===> onMessage - ', eventData);
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
      onMstEvent,
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
