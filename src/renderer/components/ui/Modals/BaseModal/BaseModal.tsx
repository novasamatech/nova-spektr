import { Fragment, PropsWithChildren, ReactNode } from 'react';
import { Dialog, Transition } from '@headlessui/react';

import cnTw from '@renderer/shared/utils/twMerge';
import { ReactComponent as CloseCutout } from '@images/functionals/close-cutout.svg';
import { useI18n } from '@renderer/context/I18nContext';

type Props = {
  isOpen: boolean;
  title?: ReactNode;
  description?: ReactNode;
  contentClass?: string;
  headerClass?: string;
  closeButton?: boolean;
  onClose: () => void;
};

const BaseModal = ({
  isOpen,
  title,
  description,
  children,
  onClose,
  contentClass = 'pb-5 px-5',
  headerClass = 'pt-5 px-5',
  closeButton,
}: PropsWithChildren<Props>) => {
  const { t } = useI18n();

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 backdrop-blur-sm bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
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
              <Dialog.Panel className="transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-xl transition-all">
                {title && closeButton && (
                  <Dialog.Title as="header">
                    <div className={cnTw('relative flex justify-end items-center', headerClass)}>
                      <h2 className="absolute left-1/2 -translate-x-1/2 w-max text-xl text-neutral font-semibold leading-5">
                        {title}
                      </h2>
                      <button
                        aria-label={t('basemodal.closeButton')}
                        type="button"
                        className="text-neutral-variant -outline-offset-2"
                        onClick={onClose}
                      >
                        <CloseCutout role="img" width={22} height={22} />
                      </button>
                    </div>
                  </Dialog.Title>
                )}
                {title && !closeButton && (
                  <Dialog.Title
                    as="header"
                    className={cnTw('text-xl text-neutral font-semibold leading-5 text-center', headerClass)}
                  >
                    {title}
                  </Dialog.Title>
                )}

                {description && (
                  <Dialog.Description as="div" className="mt-1.5 text-base text-neutral-variant text-center">
                    {description}
                  </Dialog.Description>
                )}

                <div className={contentClass}>{children}</div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default BaseModal;
