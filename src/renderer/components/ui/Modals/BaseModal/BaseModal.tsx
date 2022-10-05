import { Fragment, PropsWithChildren, ReactNode } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import cn from 'classnames';

import { ReactComponent as CloseCutout } from '@images/functionals/close-cutout.svg';
import { useI18n } from '@renderer/context/I18nContext';

type Props = {
  isOpen: boolean;
  title?: ReactNode;
  description?: ReactNode;
  className?: string;
  closeButton?: boolean;
  onClose: () => void;
};

const BaseModal = ({
  isOpen,
  title,
  description,
  children,
  onClose,
  className,
  closeButton,
}: PropsWithChildren<Props>) => {
  const { t } = useI18n();

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
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
              <Dialog.Panel
                className={cn(
                  'transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-xl transition-all',
                  className,
                )}
              >
                {title && closeButton && (
                  <Dialog.Title as="header">
                    <div className="relative flex justify-center">
                      <h2 className="text-xl text-neutral font-semibold leading-5">{title}</h2>
                      <button
                        aria-label={t('basemodal.closeButton')}
                        type="button"
                        className="absolute right-0.5 text-neutral-variant"
                        onClick={onClose}
                      >
                        <CloseCutout role="img" width={24} height={24} />
                      </button>
                    </div>
                  </Dialog.Title>
                )}
                {title && !closeButton && (
                  <Dialog.Title as="header" className="text-xl text-neutral font-semibold leading-5 text-center">
                    {title}
                  </Dialog.Title>
                )}

                {description && (
                  <Dialog.Description as="div" className="mt-1.5 text-base text-neutral-variant text-center">
                    {description}
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
};

export default BaseModal;
