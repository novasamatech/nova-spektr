import { Fragment, PropsWithChildren, ReactNode } from 'react';
import { Dialog, Transition } from '@headlessui/react';

import { ModalTransition } from '../common/ModalTransition';
import { ModalBackdrop } from '../common/ModalBackdrop';
import { FootnoteText, SmallTitleText } from '@shared/ui';
import { cnTw } from '@shared/lib/utils';

type Props = {
  content?: ReactNode;
  title: string;
  description?: string;
  isOpen: boolean;
  zIndex?: string;
  onClose: () => void;
  className?: string;
};

export const StatusModal = ({
  title,
  description,
  isOpen,
  zIndex = 'z-50',
  content,
  className,
  children,
  onClose,
}: PropsWithChildren<Props>) => {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className={cnTw('relative', zIndex)} onClose={onClose}>
        <ModalBackdrop />

        <div className="fixed inset-0 overflow-hidden flex min-h-full w-full items-center justify-center text-center">
          <ModalTransition>
            <Dialog.Panel
              className={cnTw(
                'w-[240px] max-w-md transform flex flex-col items-center justify-center rounded-lg align-middle',
                'bg-white p-4 shadow-card-shadow transition-all',
                className,
              )}
            >
              {content}

              <Dialog.Title className="font-semibold mb-2">
                <SmallTitleText align="center">{title}</SmallTitleText>
              </Dialog.Title>

              {description && (
                <FootnoteText className="text-text-tertiary" align="center">
                  {description}
                </FootnoteText>
              )}

              {children && <div className="mt-3">{children}</div>}
            </Dialog.Panel>
          </ModalTransition>
        </div>
      </Dialog>
    </Transition>
  );
};
