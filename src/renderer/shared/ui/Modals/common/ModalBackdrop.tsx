import { Transition } from '@headlessui/react';
import { Fragment } from 'react';

export const ModalBackdrop = () => (
  <Transition.Child
    as={Fragment}
    enter="ease-out duration-300"
    enterFrom="opacity-0"
    enterTo="opacity-100"
    leave="ease-in duration-200"
    leaveFrom="opacity-100"
    leaveTo="opacity-0"
  >
    <div className="bg-dim-background fixed inset-0" />
  </Transition.Child>
);
