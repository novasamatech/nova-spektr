import { Dialog, Transition } from '@headlessui/react';
import { Fragment, type PropsWithChildren, type ReactNode } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { FootnoteText, SmallTitleText } from '../../Typography';
import { ModalBackdrop } from '../common/ModalBackdrop';
import { ModalTransition } from '../common/ModalTransition';

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
    <Transition appear leave="duration-400" show={isOpen} as={Fragment}>
      <Dialog as="div" className={cnTw('pointer-events-auto relative', zIndex)} onClose={onClose}>
        <ModalBackdrop />

        <div className="fixed inset-0 flex min-h-full w-full items-center justify-center overflow-hidden text-center">
          <ModalTransition>
            <Dialog.Panel
              className={cnTw(
                'flex w-[240px] max-w-md transform flex-col items-center justify-center rounded-lg align-middle',
                'bg-white p-4 shadow-card-shadow transition-all',
                className,
              )}
            >
              {content}

              <Dialog.Title className="mb-2 font-semibold">
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
