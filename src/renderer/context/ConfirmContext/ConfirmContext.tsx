import { createContext, PropsWithChildren, useCallback, useContext, useRef, useState } from 'react';

import { ConfirmModal } from '@renderer/components/ui';

export type ConfirmDialogProps = {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
};

type ConfirmContextProps = {
  confirm: (props: ConfirmDialogProps) => Promise<any>;
};

const ConfirmDialog = createContext<ConfirmContextProps>({} as ConfirmContextProps);

const defaultState = {
  isOpen: false,
  title: '',
  message: '',
  confirmText: '',
  cancelText: '',
};

export const ConfirmDialogProvider = ({ children }: PropsWithChildren) => {
  const [currentState, setCurrentState] = useState(defaultState);

  const fn = useRef<(choice: any) => void>();

  const confirm = useCallback(
    (data: ConfirmDialogProps) => {
      return new Promise((resolve) => {
        setCurrentState({ ...data, isOpen: true });

        fn.current = (choice: boolean) => {
          resolve(choice);
          setCurrentState(defaultState);
        };
      });
    },
    [setCurrentState],
  );

  return (
    <ConfirmDialog.Provider value={{ confirm }}>
      {children}

      <ConfirmModal
        className="w-[400px]"
        isOpen={currentState.isOpen}
        onClose={() => fn.current?.(false)}
        onConfirm={() => fn.current?.(true)}
        confirmText={currentState.confirmText}
        cancelText={currentState.cancelText}
      >
        <h2 className="text-error font-semibold text-xl border-b border-error pb-2.5">{currentState.title}</h2>
        <p className="pt-2.5 pb-5 text-neutral-variant">{currentState.message}</p>
      </ConfirmModal>
    </ConfirmDialog.Provider>
  );
};

export const useConfirmContext = () => useContext<ConfirmContextProps>(ConfirmDialog);
