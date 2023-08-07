import { createContext, PropsWithChildren, useCallback, useContext, useRef, useState, ReactNode } from 'react';

import { ConfirmModal, SmallTitleText, FootnoteText } from '@renderer/shared/ui';
import { DEFAULT_TRANSITION } from '@renderer/shared/lib/utils';
import { useToggle } from '@renderer/shared/lib/hooks';

export type ConfirmDialogProps = {
  title: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
};

type ConfirmContextProps = {
  confirm: (props: ConfirmDialogProps) => Promise<boolean>;
};

const ConfirmDialog = createContext<ConfirmContextProps>({} as ConfirmContextProps);

const defaultState = {
  title: '',
  message: '',
  confirmText: '',
  cancelText: '',
};

export const ConfirmDialogProvider = ({ children }: PropsWithChildren) => {
  const [isDialogOpen, toggleDialog] = useToggle();

  const [dialogState, setDialogState] = useState<ConfirmDialogProps>(defaultState);

  const fn = useRef<(choice: any) => void>();

  const confirm = useCallback((data: ConfirmDialogProps): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialogState(data);
      toggleDialog();

      fn.current = (choice: boolean) => {
        toggleDialog();
        resolve(choice);
        setTimeout(() => {
          setDialogState(defaultState);
        }, DEFAULT_TRANSITION);
      };
    });
  }, []);

  return (
    <ConfirmDialog.Provider value={{ confirm }}>
      {children}

      <ConfirmModal
        panelClass="w-[300px]"
        isOpen={isDialogOpen}
        confirmText={dialogState.confirmText}
        cancelText={dialogState.cancelText}
        onClose={() => fn.current?.(false)}
        onConfirm={() => fn.current?.(true)}
      >
        <SmallTitleText align="center">{dialogState.title}</SmallTitleText>
        <FootnoteText className="mt-2 text-text-tertiary" align="center">
          {dialogState.message}
        </FootnoteText>
      </ConfirmModal>
    </ConfirmDialog.Provider>
  );
};

export const useConfirmContext = () => useContext<ConfirmContextProps>(ConfirmDialog);
