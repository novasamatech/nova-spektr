import { useUnit } from 'effector-react';
import { Popover, Transition } from '@headlessui/react';
import { ReactNode } from 'react';

import { walletModel } from '@renderer/entities/wallet';
import { Shimmering } from '@renderer/shared/ui';
import { WalletPanel } from './WalletPanel';
import { WalletButton } from './WalletButton';

type Props = {
  action?: ReactNode;
};
export const WalletSelect = ({ action }: Props) => {
  const activeWallet = useUnit(walletModel.$activeWallet);

  if (!activeWallet) {
    return <Shimmering width={100} height={40} />;
  }

  return (
    <Popover className="relative">
      <WalletButton wallet={activeWallet} />
      <Transition
        enter="transition ease-out duration-200"
        enterFrom="opacity-0 translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-1"
      >
        <WalletPanel action={action} />
      </Transition>
    </Popover>
  );
};
