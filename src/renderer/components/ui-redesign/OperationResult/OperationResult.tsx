import { Fragment, PropsWithChildren } from 'react';
import { Dialog, Transition } from '@headlessui/react';

import cnTw from '@renderer/shared/utils/twMerge';
import { Icon } from '@renderer/components/ui';
import { ModalBackdrop, ModalTransition } from '@renderer/components/ui-redesign/Modals/common';
import { OperationVariant, variantIcons, variantStyles } from './constants';
import { FootnoteText, SmallTitleText } from '@renderer/components/ui-redesign';

type Props = {
  isOpen: boolean;
  variant?: OperationVariant;
  title: string;
  description?: string;
  onClose: () => void;
};

const OperationResult = ({
  children,
  isOpen,
  variant = 'success',
  title,
  description,
  onClose,
}: PropsWithChildren<Props>) => (
  <Transition appear show={isOpen} as={Fragment}>
    <Dialog as="div" className="relative z-50" onClose={onClose}>
      <ModalBackdrop />

      <div className="fixed inset-0 overflow-hidden flex min-h-full w-full items-center justify-center text-center">
        <ModalTransition>
          {/* TODO: change bg color */}
          <Dialog.Panel className="w-[240px] max-w-md transform flex flex-col items-center justify-center rounded-lg bg-white p-4 align-middle shadow-card-shadow transition-all">
            <Icon name={variantIcons[variant]} className={cnTw('mb-2', variantStyles[variant])} />
            <Dialog.Title className="font-semibold mb-2">
              <SmallTitleText>{title}</SmallTitleText>
            </Dialog.Title>
            {description && (
              <Dialog.Description className="text-text-tertiary">
                <FootnoteText>{description}</FootnoteText>
              </Dialog.Description>
            )}
            {children}
          </Dialog.Panel>
        </ModalTransition>
      </div>
    </Dialog>
  </Transition>
);

export default OperationResult;
