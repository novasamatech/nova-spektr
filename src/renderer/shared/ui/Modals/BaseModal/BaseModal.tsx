import { Fragment, PropsWithChildren, ReactNode } from 'react';
import { Dialog, Transition } from '@headlessui/react';

import { cnTw } from '@shared/lib/utils';
import { ModalTransition } from '../common/ModalTransition';
import { ModalBackdrop } from '../common/ModalBackdrop';
import { HeaderTitleText, IconButton } from '@shared/ui';

type Props = {
  isOpen: boolean;
  title?: ReactNode;
  zIndex?: string;
  contentClass?: string;
  headerClass?: string;
  panelClass?: string;
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
  onClose,
}: PropsWithChildren<Props>) => {
  const headerExist = title || actionButton || closeButton;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className={cnTw('relative', zIndex)} onClose={() => onClose()}>
        <ModalBackdrop />

        <div className="fixed inset-0 overflow-hidden flex min-h-full items-center justify-center p-4">
          <ModalTransition>
            <Dialog.Panel
              className={cnTw(
                'transform rounded-lg bg-white text-left align-middle shadow-modal transition-all w-[440px] ',
                panelClass,
              )}
            >
              {headerExist && (
                <header className={cnTw('flex items-center justify-between', headerClass)}>
                  {title && typeof title === 'string' && (
                    <Dialog.Title as={HeaderTitleText} className="text-text-primary font-bold truncate py-1">
                      {title}
                    </Dialog.Title>
                  )}

                  {title && typeof title !== 'string' && title}
                  <div className="flex items-center gap-x-4 h-7.5 z-20">
                    {actionButton}
                    {closeButton && <IconButton name="close" size={20} className="m-1" onClick={() => onClose()} />}
                  </div>
                </header>
              )}

              <section className={contentClass}>{children}</section>
            </Dialog.Panel>
          </ModalTransition>
        </div>
      </Dialog>
    </Transition>
  );
};
