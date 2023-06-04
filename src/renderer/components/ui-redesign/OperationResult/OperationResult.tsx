import { Fragment, PropsWithChildren } from 'react';
import { Dialog, Transition } from '@headlessui/react';

import cnTw from '@renderer/shared/utils/twMerge';
import { Icon } from '@renderer/components/ui';
import { ModalBackdrop, ModalTransition } from '@renderer/components/ui-redesign/Modals/common';
import { FootnoteText, SmallTitleText } from '@renderer/components/ui-redesign';
import { VariantIcons, VariantStyles } from './common/constants';
import { Variant } from './common/types';

type Props = {
  title: string;
  variant?: Variant;
  description?: string;
  isOpen: boolean;
  onClose: () => void;
};

const OperationResult = ({
  title,
  variant = 'success',
  description,
  isOpen,
  children,
  onClose,
}: PropsWithChildren<Props>) => (
  <Transition appear show={isOpen} as={Fragment}>
    <Dialog as="div" className="relative z-50" onClose={onClose}>
      <ModalBackdrop />

      <div className="fixed inset-0 overflow-hidden flex min-h-full w-full items-center justify-center text-center">
        <ModalTransition>
          {/* TODO: change bg color */}
          <Dialog.Panel className="w-[240px] max-w-md transform flex flex-col items-center justify-center rounded-lg bg-white p-4 align-middle shadow-card-shadow transition-all">
            <Icon name={VariantIcons[variant]} className={cnTw('mb-2', VariantStyles[variant])} />
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
