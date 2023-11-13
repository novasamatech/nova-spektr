import { createContext, PropsWithChildren, useCallback, useContext, useRef, useState, ReactNode } from 'react';

import { StatusModal } from '@shared/ui';
import { DEFAULT_TRANSITION } from '@shared/lib/utils';
import { useToggle } from '@shared/lib/hooks';

export type StatusModalProps = {
  title: string;
  description?: string;
  content?: ReactNode;
};

type StatusContextProps = {
  showStatus: (props: StatusModalProps) => Promise<void>;
};

const StatusDialog = createContext<StatusContextProps>({} as StatusContextProps);

const defaultState = {
  title: '',
  description: '',
};

export const StatusModalProvider = ({ children }: PropsWithChildren) => {
  const [isDialogOpen, toggleDialog] = useToggle();

  const [dialogState, setDialogState] = useState<StatusModalProps>(defaultState);

  const fn = useRef<() => void>();

  const showStatus = useCallback((data: StatusModalProps): Promise<void> => {
    return new Promise((resolve) => {
      setDialogState(data);
      toggleDialog();

      fn.current = () => {
        toggleDialog();
        resolve();
        setTimeout(() => {
          setDialogState(defaultState);
        }, DEFAULT_TRANSITION);
      };
    });
  }, []);

  return (
    <StatusDialog.Provider value={{ showStatus }}>
      {children}

      <StatusModal
        isOpen={isDialogOpen}
        title={dialogState.title}
        description={dialogState.description}
        content={dialogState.content}
        onClose={() => fn.current?.()}
      ></StatusModal>
    </StatusDialog.Provider>
  );
};

export const useStatusContext = () => useContext<StatusContextProps>(StatusDialog);
