import { Fragment, PropsWithChildren, ReactNode } from 'react';
import { Dialog, Transition } from '@headlessui/react';

import { cnTw } from '@renderer/shared/lib/utils';
import { useI18n } from '@renderer/app/providers';
import { HeaderTitleText } from '../../Typography';
import { IconButton } from '../../Buttons';
import { ModalBackdrop, ModalTransition } from '../common';

// HINT: There are no modals with description right now
// HeadlessUI provides description and title with some a11y features

type Props = {
  isOpen: boolean;
  title?: ReactNode;
  contentClass?: string;
  headerClass?: string;
  panelClass?: string;
  closeButton?: boolean;
  onClose: () => void;
};

export const BaseModal = ({
  isOpen,
  title,
  children,
  onClose,
  contentClass = 'pb-4 px-5',
  headerClass = 'py-3 px-5',
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
                'transform rounded-lg bg-white text-left align-middle shadow-modal transition-all w-[440px]',
                panelClass,
              )}
            >
              {title && (
                <Dialog.Title
                  as="header"
                  className={cnTw('text-text-primary font-bold', headerClass, closeButton && 'pr-12')}
                >
                  {typeof title === 'string' ? <HeaderTitleText className="truncate">{title}</HeaderTitleText> : title}
                </Dialog.Title>
              )}

              {closeButton && (
                <IconButton
                  name="close"
                  size={20}
                  className="absolute top-[18px] right-[14px] z-10"
                  ariaLabel={t('basemodal.closeButton')}
                  onClick={onClose}
                />
              )}

              <section className={contentClass}>{children}</section>
            </Dialog.Panel>
          </ModalTransition>
        </div>
      </Dialog>
    </Transition>
  );
};
