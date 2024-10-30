import { useUnit } from 'effector-react';
import { Fragment, type ReactNode } from 'react';

import { Popover, Skeleton } from '@/shared/ui-kit';
import { walletModel } from '@/entities/wallet';
import { walletSelectModel } from '../model/wallet-select-model';

import { WalletButton } from './WalletButton';
import { WalletPanel } from './WalletPanel';

type Props = {
  action?: ReactNode;
};
export const WalletSelect = ({ action }: Props) => {
  const activeWallet = useUnit(walletModel.$activeWallet);

  if (!activeWallet) {
    return <Skeleton width={208} height={56} />;
  }

  const hideWalletPanel = (close: () => void) => {
    return () => {
      close();
      walletSelectModel.events.clearData();
    };
  };

  return (
    <Popover>
      {({ close }) => (
        <Fragment>
          <WalletButton wallet={activeWallet} />
          <WalletPanel action={action} onClose={hideWalletPanel(close)} />
        </Fragment>
      )}
    </Popover>
  );
};
