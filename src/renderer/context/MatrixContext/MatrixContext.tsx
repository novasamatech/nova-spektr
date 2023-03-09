import { PropsWithChildren, createContext, useContext, useEffect, useRef, useState } from 'react';

import Matrix, { InvitePayload, ISecureMessenger, MSTPayload } from '@renderer/services/matrix';

type MatrixContextProps = {
  matrix: ISecureMessenger;
  isLoggedIn: boolean;
};

const MatrixContext = createContext<MatrixContextProps>({} as MatrixContextProps);

export const MatrixProvider = ({ children }: PropsWithChildren) => {
  const { current: matrix } = useRef<ISecureMessenger>(new Matrix());

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const onSyncProgress = () => {
    if (!isLoggedIn) {
      setIsLoggedIn(true);
    }

    console.log('💛 ===> onSyncProgress');
  };

  const onSyncEnd = () => {
    console.log('💛 ===> onSyncEnd');
  };

  const onMessage = (value: any) => {
    console.log('💛 ===> onMessage - ', value);
  };

  const onInvite = ({ eventId, ...rest }: InvitePayload) => {
    console.log('💛 ===> onMessage - ', eventId, rest);
  };

  const onMstEvent = (eventData: MSTPayload) => {
    console.log('💛 ===> onMessage - ', eventData);
  };

  const onOnLogout = () => {
    console.log('🛑 ===> onOnLogout');
    setIsLoggedIn(false);
  };

  useEffect(() => {
    matrix.setupSubscribers({
      onSyncProgress,
      onSyncEnd,
      onMessage,
      onInvite,
      onMstEvent,
      onOnLogout,
    });

    matrix.loginFromCache().catch(console.warn);

    return () => {
      matrix.stopClient();
    };
  }, []);

  return <MatrixContext.Provider value={{ matrix, isLoggedIn }}>{children}</MatrixContext.Provider>;
};

export const useMatrix = () => useContext<MatrixContextProps>(MatrixContext);
