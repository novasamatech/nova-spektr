import { Fragment, PropsWithChildren } from 'react';
import { Dialog, Transition } from '@headlessui/react';

import { Icon } from '@renderer/components/ui';
import BodyText from '@renderer/components/ui-redesign/Typography/components/BodyText';
import CalloutText from '@renderer/components/ui-redesign/Typography/components/CalloutText';

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
      <Transition.Child
        as={Fragment}
        enter="ease-out duration-300"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="ease-in duration-200"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <div className="fixed inset-0 bg-dim-background" />
      </Transition.Child>

      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full w-full items-center justify-center text-center">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            {/* TODO: change bg color */}
            <Dialog.Panel className="w-[240px] max-w-md transform overflow-hidden flex flex-col items-center justify-center rounded-lg bg-white px-4 py-5 align-middle shadow-card-shadow transition-all">
              <Icon name={variantIcons[variant]} className="mb-2" />
              <Dialog.Title className="font-medium mb-1.5">
                <BodyText>{title}</BodyText>
              </Dialog.Title>
              {description && (
                <Dialog.Description className="text-text-tertiary">
                  <CalloutText>{description}</CalloutText>
                </Dialog.Description>
              )}
              {children}
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </div>
    </Dialog>
  </Transition>
);

export default OperationResult;
