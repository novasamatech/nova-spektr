import { Popover, Transition } from '@headlessui/react';
import { Fragment } from 'react';

export const WalletSelect = () => {
  // const activeWallet = useUnit(walletModel.$activeWallet);

  return (
    <Popover className="relative">
      <Popover.Button className="group inline-flex items-center rounded-md bg-orange-700 px-3 py-2 text-base font-medium text-white hover:text-opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75">
        {/*<div className="flex items-center px-3 py-2 gap-x-2 flex-1">*/}
        {/*  {walletUtils.isMultiShard(activeWallet) ? (*/}
        {/*    <FootnoteText*/}
        {/*      as="span"*/}
        {/*      align="center"*/}
        {/*      className="border border-token-container-border bg-token-container-background py-1 h-7 w-7"*/}
        {/*    >*/}
        {/*      {activeAccounts.length > 99 ? '99+' : activeAccounts.length}*/}
        {/*    </FootnoteText>*/}
        {/*  ) : (*/}
        {/*    <Identicon*/}
        {/*      address={toAddress(activeAccounts[0].accountId, {*/}
        {/*        prefix: getChainAddressPrefix(chains, activeAccounts[0]),*/}
        {/*      })}*/}
        {/*      background={false}*/}
        {/*      size={28}*/}
        {/*    />*/}
        {/*  )}*/}
        {/*  <div className="flex flex-col gap-y-1 overflow-hidden">*/}
        {/*    <BodyText className="truncate">{activeWallet.name}</BodyText>*/}
        {/*    <div className="flex items-center gap-x-1">*/}
        {/*      <Icon name={GroupIcons[activeWallet.type]} className="text-chip-icon" size={14} />*/}
        {/*      <CaptionText className="text-chip-text uppercase">{t(GroupLabels[activeWallet.type])}</CaptionText>*/}
        {/*    </div>*/}
        {/*    <WalletFiatBalance key={activeWallet.id} />*/}
        {/*  </div>*/}

        {/*  <Icon name="down" size={16} className="ml-auto shrink-0" />*/}
        {/*</div>*/}
      </Popover.Button>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-200"
        enterFrom="opacity-0 translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-1"
      >
        <Popover.Panel className="absolute z-20 rounded-md bg-token-container-background border border-token-container-border shadow-card-shadow">
          <div className="relative">
            <li>
              <div>
                <button>1</button>
                <button>2</button>
              </div>
            </li>
            <li>
              <button>3</button>
            </li>
            <li>
              <button>4</button>
            </li>
          </div>
        </Popover.Panel>
      </Transition>
    </Popover>
  );
};
