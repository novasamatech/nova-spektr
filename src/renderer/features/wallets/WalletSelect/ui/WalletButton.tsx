import { TEST_IDS } from '@/shared/constants';
import { type Wallet } from '@/shared/core';
import { Icon } from '@/shared/ui';
import { Box, Popover } from '@/shared/ui-kit';
import { WalletCardLg } from '@/entities/wallet';

import { WalletFiatBalance } from './WalletFiatBalance';

type Props = {
  wallet: Wallet;
};
export const WalletButton = ({ wallet }: Props) => {
  return (
    <Popover.Trigger>
      <button
        type="button"
        data-testid={TEST_IDS.COMMON.WALLET_BUTTON}
        className="w-full rounded-md border border-container-border bg-left-navigation-menu-background shadow-card-shadow"
      >
        <Box direction="row" verticalAlign="center" horizontalAlign="space-between" padding={3}>
          <WalletCardLg wallet={wallet} description={<WalletFiatBalance walletId={wallet.id} className="truncate" />} />
          <Icon name="down" size={16} className="ml-auto shrink-0" />
        </Box>
      </button>
    </Popover.Trigger>
  );
};
