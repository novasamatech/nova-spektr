import { useUnit, useGate } from 'effector-react';
import { Popover, Transition } from '@headlessui/react';
import { ReactNode, useMemo } from 'react';
import keyBy from 'lodash/keyBy';

import { walletModel } from '@entities/wallet';
import { Shimmering } from '@shared/ui';
import { WalletPanel } from './WalletPanel';
import { WalletButton } from './WalletButton';
import { useBalance } from '@entities/asset';
import { chainsService } from '@entities/network';
import { walletSelectModel } from '@features/wallets/WalletSelect/model/wallet-select-model';

type Props = {
  action?: ReactNode;
};
export const WalletSelect = ({ action }: Props) => {
  const activeWallet = useUnit(walletModel.$activeWallet);
  const accounts = useUnit(walletModel.$accounts);

  const { getLiveBalances } = useBalance();
  const balances = getLiveBalances(accounts.map((a) => a.accountId));

  const chainsMap = useMemo(() => {
    return keyBy(chainsService.getChainsData(), 'chainId');
  }, []);

  useGate(walletSelectModel.PropsGate, { balances, chains: chainsMap });

  if (!activeWallet) {
    return <Shimmering width={208} height={56} />;
  }

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
            <WalletPanel action={action} onClose={close} />
          </Transition>
        </>
      )}
    </Popover>
  );
};
