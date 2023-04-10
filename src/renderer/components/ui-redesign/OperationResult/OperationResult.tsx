import { Fragment, PropsWithChildren } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import cn from 'classnames';

import { Icon } from '@renderer/components/ui';
import BodyText from '@renderer/components/ui-redesign/Typography/components/BodyText';
import CalloutText from '@renderer/components/ui-redesign/Typography/components/CalloutText';
import { ModalBackdrop, ModalTransition } from '@renderer/components/ui-redesign/Modals/common';

type Variant = 'success' | 'error' | 'loading';

const variantIcons = {
  success: 'statusSuccess',
  error: 'statusError',
  loading: 'loaderRedesign',
} as const;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  variant?: Variant;
  title: string;
  description?: string;
};

const OperationResult = ({
  children,
  isOpen,
  onClose,
  variant = 'success',
  title,
  description,
}: PropsWithChildren<Props>) => (
  <Transition appear show={isOpen} as={Fragment}>
    <Dialog as="div" className="relative z-30" onClose={onClose}>
      <ModalBackdrop />

      <div className="fixed inset-0 overflow-hidden flex min-h-full w-full items-center justify-center text-center">
        <ModalTransition>
          {/* TODO: change bg color */}
          <Dialog.Panel className="w-[240px] max-w-md transform flex flex-col items-center justify-center rounded-lg bg-white px-4 py-5 align-middle shadow-card-shadow transition-all">
            <Icon name={variantIcons[variant]} className={cn('mb-2', variant === 'loading' && 'animate-spin')} />
            <Dialog.Title className="font-semibold mb-1.5">
              <BodyText>{title}</BodyText>
            </Dialog.Title>
            {description && (
              <Dialog.Description className="text-text-tertiary">
                <CalloutText>{description}</CalloutText>
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
