import { createContext, PropsWithChildren, ReactNode, useContext, useEffect, useRef, useState } from 'react';

import Matrix, { InvitePayload, ISecureMessenger, MSTPayload } from '@renderer/services/matrix';

type MatrixContextProps = {
  matrix: ISecureMessenger;
  notifications: Notification[];
  setIsLoggedIn: (flag: boolean) => void;
};

const MatrixContext = createContext<MatrixContextProps>({} as MatrixContextProps);

type Props = {
  loader: ReactNode;
  onAutoLoginFail: (message: string) => void;
};

export const MatrixProvider = ({ loader, onAutoLoginFail, children }: PropsWithChildren<Props>) => {
  const { current: matrix } = useRef<ISecureMessenger>(new Matrix({}));

  const [isMatrixLoading, setIsMatrixLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const initMatrix = async () => {
      try {
        await matrix.init();
        //   await matrix.loginFromCache();
        //   setIsLoggedIn(true);
      } catch (error) {
        onAutoLoginFail((error as Error).message);
      }

      setIsMatrixLoading(false);
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

  if (isMatrixLoading) {
    return <>{loader}</>;
  }

  return (
    <MatrixContext.Provider value={{ matrix, setIsLoggedIn, notifications: [] }}>{children}</MatrixContext.Provider>
  );
};

export const useMatrix = () => useContext<MatrixContextProps>(MatrixContext);
