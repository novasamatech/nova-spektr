import { Fragment, PropsWithChildren } from 'react';
import { Dialog, Transition } from '@headlessui/react';

import { ModalBackdrop, ModalTransition } from '@renderer/components/ui-redesign/Modals/common';
import { FootnoteText, SmallTitleText, Animation } from '@renderer/components/ui-redesign';
import { VariantAnimations, VariantAnimationProps } from './common/constants';
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
            <Animation name={VariantAnimations[variant]} {...VariantAnimationProps[variant]} />
            <Dialog.Title className="font-semibold mb-2">
              <SmallTitleText>{title}</SmallTitleText>
            </Dialog.Title>
            {description && <FootnoteText className="text-text-tertiary">{description}</FootnoteText>}
            <div className="mt-2">{children}</div>
          </Dialog.Panel>
        </ModalTransition>
      </div>
    </Dialog>
  </Transition>
);

export default OperationResult;
