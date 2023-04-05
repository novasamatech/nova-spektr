import { Fragment, PropsWithChildren, ReactNode } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import cn from 'classnames';

import TitleText from '@renderer/components/ui-redesign/Typography/components/TitleText';
import Icon from '@renderer/components/ui/Icon/Icon';
import { useI18n } from '@renderer/context/I18nContext';

type Props = {
  isOpen: boolean;
  title?: ReactNode;
  // description?: ReactNode; there is no modals with description rn, but it should be used in the future
  // headless ui description and title provide some a11y features
  contentClass?: string;
  headerClass?: string;
  panelClass?: string;
  closeButton?: boolean;
  onClose: () => void;
};

const BaseModal = ({
  isOpen,
  title,
  children,
  onClose,
  contentClass = 'pb-6 px-10',
  headerClass = 'pt-5 px-10',
  closeButton,
  panelClass,
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
          <div className="fixed inset-0 bg-redesign-modal-backdrop" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className={cn('flex min-h-full items-center justify-center p-4', panelClass)}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="transform overflow-hidden rounded-lg bg-white text-left align-middle shadow-modal transition-all">
                {title && (
                  <Dialog.Title as="header" className={cn('text-redesign-text-primary font-bold', headerClass)}>
                    <TitleText>{title}</TitleText>
                  </Dialog.Title>
                )}

                {closeButton && (
                  <button
                    aria-label={t('basemodal.closeButton')}
                    type="button"
                    className="text-redesign-icon-gray absolute top-4 right-4"
                    onClick={onClose}
                  >
                    <Icon name="close" size={24} />
                  </button>
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
