import { Fragment, PropsWithChildren, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';

import { ModalBackdrop, ModalTransition } from '@renderer/shared/ui/Modals/common';
import { FootnoteText, SmallTitleText } from '@renderer/shared/ui';
import { Animation } from '@renderer/shared/ui/Animation/Animation';
import { VariantAnimationProps } from './common/constants';
import { Variant } from './common/types';
import Animations from '@renderer/shared/ui/Animation/Data';

type Props = {
  title: string;
  variant?: Variant;
  description?: string;
  isOpen: boolean;
  onClose: () => void;
};

export const OperationResult = ({
  title,
  variant = 'success',
  description,
  isOpen,
  children,
  onClose,
}: PropsWithChildren<Props>) => {
  const [animation, setAnimation] = useState();

  useEffect(() => {
    if (isOpen) {
      // using same animation repeatedly without deep clone lead to memory leak
      // https://github.com/airbnb/lottie-web/issues/1159
      setAnimation(JSON.parse(JSON.stringify(Animations[variant])));
    }
  }, [isOpen, variant]);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <ModalBackdrop />

        <div className="fixed inset-0 overflow-hidden flex min-h-full w-full items-center justify-center text-center">
          <ModalTransition>
            <Dialog.Panel className="w-[240px] max-w-md transform flex flex-col items-center justify-center rounded-lg bg-white p-4 align-middle shadow-card-shadow transition-all">
              {animation && <Animation animation={animation} {...VariantAnimationProps[variant]} />}
              <Dialog.Title className="font-semibold mb-2">
                <SmallTitleText align="center">{title}</SmallTitleText>
              </Dialog.Title>
              {description && (
                <FootnoteText className="text-text-tertiary" align="center">
                  {description}
                </FootnoteText>
              )}
              <div className="mt-3">{children}</div>
            </Dialog.Panel>
          </ModalTransition>
        </div>
      </Dialog>
    </Transition>
  );
};
