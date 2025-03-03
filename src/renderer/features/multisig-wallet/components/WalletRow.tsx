import { type Wallet } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { WalletManagement } from '@/shared/ui-entities';
import { walletsFiatBalanceFeature } from '@/features/wallet-fiat-balance';

const {
  views: { WalletFiatBalance },
} = walletsFiatBalanceFeature;

export const walletActionsSlot = createSlot<{ wallet: Wallet }>();

type Props = {
  wallet: Wallet;
  onSelect: (wallet: Wallet) => unknown;
};
export const WalletRow = ({ wallet, onSelect }: Props) => {
  return (
    <WalletManagement
      wallet={wallet}
      description={<WalletFiatBalance walletId={wallet.id} className="max-w-[215px] truncate text-help-text" />}
      onClick={() => onSelect(wallet)}
    >
      <Slot id={walletActionsSlot} props={{ wallet }} />
    </WalletManagement>
  );
};
