import * as Dialog from '@radix-ui/react-dialog';
import { type PropsWithChildren, type ReactNode } from 'react';

import { cnTw } from '@shared/lib/utils';
import { IconButton } from '../../Buttons';
import { HeaderTitleText } from '../../Typography';

type Props = {
  isOpen: boolean;
  title?: ReactNode;
  zIndex?: string;
  contentClass?: string;
  headerClass?: string;
  panelClass?: string;
  panelStyle?: object;
  closeButton?: boolean;
  actionButton?: ReactNode;
  onClose: () => void;
};

export const BaseModal = ({
  isOpen,
  title,
  zIndex = 'z-50',
  contentClass = 'pb-4 px-5',
  headerClass = 'pl-5 pr-3 pt-3',
  actionButton,
  closeButton,
  panelClass,
  children,
  panelStyle,
  onClose,
}: PropsWithChildren<Props>) => {
  const headerExist = title || actionButton || closeButton;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cnTw(
            'fixed inset-0 overflow-hidden flex min-h-full items-center justify-center p-4 ',
            'bg-dim-background',
            'animate-in fade-in duration-300',
            zIndex,
          )}
        >
          <Dialog.Content
            style={panelStyle}
            className={cnTw(
              'transform rounded-lg bg-white text-left align-middle shadow-modal transition-all w-[440px]',
              'animate-in fade-in zoom-in-95 duration-300',
              panelClass,
            )}
          >
            {headerExist && (
              <Dialog.Title asChild>
                <header className={cnTw('flex items-center justify-between', headerClass)}>
                  {title && typeof title === 'string' && (
                    <HeaderTitleText className="text-text-primary font-bold truncate py-1">{title}</HeaderTitleText>
                  )}

                  {title && typeof title !== 'string' && title}

                  <div className="flex items-center gap-x-4 h-7.5 z-20">
                    {actionButton}

                    {closeButton && (
                      <Dialog.Close asChild>
                        <IconButton name="close" size={20} className="m-1" onClick={() => onClose()} />
                      </Dialog.Close>
                    )}
                  </div>
                </header>
              </Dialog.Title>
            )}
            <Dialog.Description asChild>
              <section className={contentClass}>{children}</section>
            </Dialog.Description>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
