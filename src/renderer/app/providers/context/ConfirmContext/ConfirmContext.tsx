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
import { ConfirmModal, FootnoteText, SmallTitleText } from '@shared/ui';

type Pallet = 'primary' | 'secondary' | 'error';

export type ConfirmDialogProps = {
  title: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmPallet?: Pallet;
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
  confirmPallet: undefined,
};

export const ConfirmDialogProvider = ({ children }: PropsWithChildren) => {
  const [isDialogOpen, toggleDialog] = useToggle();

  const [dialogState, setDialogState] = useState<ConfirmDialogProps>(defaultState);

  const fn = useRef<(choice: boolean) => void>();

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

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmDialog.Provider value={value}>
      {children}

      <ConfirmModal
        panelClass="w-[300px]"
        isOpen={isDialogOpen}
        confirmText={dialogState.confirmText}
        cancelText={dialogState.cancelText}
        confirmPallet={dialogState.confirmPallet}
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
