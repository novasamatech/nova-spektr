import { Transition } from '@headlessui/react';
import { Fragment, PropsWithChildren } from 'react';

export const ModalBackdrop = ({ children }: PropsWithChildren) => (
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
);
