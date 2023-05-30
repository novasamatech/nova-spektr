import { Fragment, PropsWithChildren, ReactNode } from 'react';
import { Dialog, Transition } from '@headlessui/react';

import cnTw from '@renderer/shared/utils/twMerge';
import { ModalBackdrop, ModalTransition } from '@renderer/components/ui-redesign/Modals/common';
import { useI18n } from '@renderer/context/I18nContext';
import TextBase from '@renderer/components/ui-redesign/Typography/common/TextBase';
import { IconButton } from '@renderer/components/ui-redesign';

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
  contentClass = 'pb-4 px-5',
  headerClass = 'py-3 pr-3 pl-5',
  closeButton,
  panelClass,
}: PropsWithChildren<Props>) => {
  const { t } = useI18n();

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <ModalBackdrop />

        <div className="fixed inset-0 overflow-hidden flex min-h-full items-center justify-center p-4">
          <ModalTransition>
            {/* TODO add proper colors for titles and bg */}
            <Dialog.Panel
              className={cnTw(
                'transform overflow-y-auto rounded-lg bg-white text-left align-middle shadow-modal transition-all w-[440px]',
                panelClass,
              )}
            >
              {title && (
                <Dialog.Title as="header" className={cnTw('text-black font-bold', closeButton && 'pr-11', headerClass)}>
                  {/* TODO change */}
                  <TextBase className="font-manrope text-modal-title text-text-primary truncate" fontWeight="bold">
                    {title}
                  </TextBase>
                </Dialog.Title>
              )}

              {closeButton && (
                <IconButton
                  name="close"
                  className="absolute top-3 right-3"
                  ariaLabel={t('basemodal.closeButton')}
                  onClick={onClose}
                />
              )}

              <div className={contentClass}>{children}</div>
            </Dialog.Panel>
          </ModalTransition>
        </div>
      </Dialog>
    </Transition>
  );
};

export default BaseModal;
