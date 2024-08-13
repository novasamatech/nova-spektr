import {
  type PropsWithChildren,
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useToggle } from '@shared/lib/hooks';
import { DEFAULT_TRANSITION } from '@shared/lib/utils';
import { StatusModal } from '@shared/ui';

export type StatusModalProps = {
  title: string;
  description?: string;
  content?: ReactNode;
  closeTimer?: number;
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
        setTimeout(() => setDialogState(defaultState), DEFAULT_TRANSITION);
      };

      if (data.closeTimer && data.closeTimer > 0) {
        setTimeout(fn.current, data.closeTimer);
      }
    });
  }, []);

  const value = useMemo(() => ({ showStatus }), [showStatus]);

  return (
    <StatusDialog.Provider value={value}>
      {children}

      <StatusModal
        isOpen={isDialogOpen}
        title={dialogState.title}
        description={dialogState.description}
        content={dialogState.content}
        onClose={() => fn.current?.()}
      />
    </StatusDialog.Provider>
  );
};

export const useStatusContext = () => useContext<StatusContextProps>(StatusDialog);
