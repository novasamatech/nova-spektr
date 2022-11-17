import { useState, Fragment, PropsWithChildren } from 'react';
import { Dialog, Transition } from '@headlessui/react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const Message = ({ children, isOpen, onClose }: PropsWithChildren<Props>) => {
  return (
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
          <div className="fixed inset-0 bg-white bg-opacity-50" />
        </Transition.Child>

        <div className="fixed inset-0 left-[300px] overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-fix max-w-md transform overflow-hidden rounded-2lg bg-shade-70 p-4 text-left align-middle shadow-surface transition-all">
                <Dialog.Title as="h3" className="font-semibold text-white">
                  {children}
                </Dialog.Title>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default Message;
