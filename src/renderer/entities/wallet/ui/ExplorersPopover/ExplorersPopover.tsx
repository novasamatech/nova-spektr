import { Popover, Transition } from '@headlessui/react';
import { PropsWithChildren, ReactNode, MouseEvent, useRef } from 'react';

import { cnTw, getAccountExplorer, toAddress, copyToClipboard } from '@renderer/shared/lib/utils';
import type { Address, Explorer, AccountId } from '@renderer/shared/core';
import { ExplorerLink, FootnoteText, IconButton } from '@renderer/shared/ui';
import { useI18n } from '@renderer/app/providers';

type Props = {
  button: ReactNode;
  address: Address | AccountId;
  explorers: Explorer[];
  addressPrefix?: number;
};

export const ExplorersPopover = ({ button, address, explorers, addressPrefix, children }: PropsWithChildren<Props>) => {
  const { t } = useI18n();

  const popoverRef = useRef<HTMLDivElement>(null);

  const formattedAddress = toAddress(address, { prefix: addressPrefix });

  const onButtonClick = (e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setTimeout(() => popoverRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  };

  return (
    <Popover className="relative w-full">
      <Popover.Button as="div" onClick={onButtonClick}>
        {button}
      </Popover.Button>
      <Popover.Panel
        ref={popoverRef}
        className={cnTw(
          'absolute right-0 z-10 -mt-3 py-4 px-3 rounded-md w-[230px]',
          'bg-token-container-background border border-token-container-border shadow-card-shadow',
        )}
      >
        <Transition
          enter="transition ease-out duration-200"
          enterFrom="opacity-0 translate-y-1"
          enterTo="opacity-100 translate-y-0"
          leave="transition ease-in duration-150"
          leaveFrom="opacity-100 translate-y-0"
          leaveTo="opacity-0 translate-y-1"
        >
          <PopoverGroup title={t('general.explorers.addressTitle')}>
            <div className="flex items-center gap-x-2">
              <FootnoteText className="text-text-secondary break-all">{formattedAddress}</FootnoteText>
              <IconButton
                className="shrink-0"
                name="copy"
                size={20}
                onClick={() => copyToClipboard(formattedAddress)}
              />
            </div>
          </PopoverGroup>

          {children}

          <PopoverGroup>
            {explorers.map((explorer) => (
              <ExplorerLink
                key={explorer.name}
                name={explorer.name}
                href={getAccountExplorer(explorer, { address: formattedAddress })}
              />
            ))}
          </PopoverGroup>
        </Transition>
      </Popover.Panel>
    </Popover>
  );
};

type GroupProps = {
  title?: string;
};
const PopoverGroup = ({ title, children }: PropsWithChildren<GroupProps>) => {
  return (
    <div className="pb-3 mb-3 border-b border-divider last:pb-0 last:mb-0 last:border-b-0">
      {title && <FootnoteText className="text-text-tertiary pb-2">{title}</FootnoteText>}
      {children}
    </div>
  );
};

ExplorersPopover.Group = PopoverGroup;
