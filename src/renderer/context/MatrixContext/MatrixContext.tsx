import { createContext, PropsWithChildren, useContext, useEffect, useRef, useState } from 'react';

import Matrix, { ErrorObject, InvitePayload, ISecureMessenger, MSTPayload } from '@renderer/services/matrix';

type MatrixContextProps = {
  matrix: ISecureMessenger;
  notifications: Notification[];
  isLoggedIn: boolean;
};

const MatrixContext = createContext<MatrixContextProps>({} as MatrixContextProps);

type Props = {
  onAutoLoginFail: (errorMsg: string) => void;
};

export const MatrixProvider = ({ onAutoLoginFail, children }: PropsWithChildren<Props>) => {
  const { current: matrix } = useRef<ISecureMessenger>(new Matrix());

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const initMatrix = async () => {
      try {
        await matrix.init();
        await matrix.loginFromCache();
        setIsLoggedIn(true);
      } catch (error) {
        onAutoLoginFail((error as ErrorObject).message);
      }
    };

    initMatrix();

    return () => {
      matrix.stopClient();
    };
  }, []);

  const onSyncProgress = () => {
    console.log('💛 ===> onSyncProgress');
  };

  const onSyncEnd = async () => {
    console.log('💛 ===> onSyncEnd');
  };

  const onMessage = (value: any) => {
    console.log('💛 ===> onMessage - ', value);
  };

  const onInvite = async ({ eventId, ...rest }: InvitePayload) => {
    console.log('💛 ===> onMessage - ', eventId, rest);
  };

  const onMstEvent = async (eventData: MSTPayload) => {
    console.log('💛 ===> onMessage - ', eventData);
  };

  useEffect(() => {
    if (!isLoggedIn) return;

    matrix.setupSubscribers({
      onSyncProgress,
      onSyncEnd,
      onMessage,
      onInvite,
      onMstEvent,
    });
  }, [isLoggedIn]);

  return <MatrixContext.Provider value={{ matrix, isLoggedIn, notifications: [] }}>{children}</MatrixContext.Provider>;
};

export const useMatrix = () => useContext<MatrixContextProps>(MatrixContext);
