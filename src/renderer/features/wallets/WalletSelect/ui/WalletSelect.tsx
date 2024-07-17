import { useUnit } from 'effector-react';
import { Popover, Transition } from '@headlessui/react';
import { type ReactNode } from 'react';

import { walletModel } from '@entities/wallet';
import { Shimmering } from '@shared/ui';
import { WalletPanel } from './WalletPanel';
import { WalletButton } from './WalletButton';
import { walletSelectModel } from '../model/wallet-select-model';

type Props = {
  action?: ReactNode;
};
export const WalletSelect = ({ action }: Props) => {
  const activeWallet = useUnit(walletModel.$activeWallet);

  if (!activeWallet) {
    return <Shimmering width={208} height={56} />;
  }

  const hideWalletPanel = (close: () => void) => {
    return () => {
      close();
      walletSelectModel.events.clearData();
    };
  };

  return (
    <Popover className="relative">
      {({ close }) => (
        <>
          <WalletButton wallet={activeWallet} />
          <Transition
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <WalletPanel action={action} onClose={hideWalletPanel(close)} />
          </Transition>
        </>
      )}
    </Popover>
  );
};
