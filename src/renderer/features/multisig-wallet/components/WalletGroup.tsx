import { useUnit } from 'effector-react';
import { memo } from 'react';

import { AccountType, type Chain, type Wallet, type WalletType } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { performSearch } from '@/shared/lib/utils';
import { WalletIcon, WalletManagement } from '@/shared/ui-entities';
import { Accordion, Box } from '@/shared/ui-kit';
import { accounts } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { accountUtils, walletUtils } from '@/entities/wallet';
import { walletSelect, walletSelectService } from '@/aggregates/wallet-select';
import { WalletFiatBalance } from '@/features/wallet-fiat-balance';

export const walletActionsSlot = createSlot<{ wallet: Wallet }>();

type Props = {
  title: string;
  walletType: WalletType;
  wallets: Wallet[];
  query: string;
  onSelect: (wallet: Wallet) => unknown;
};

export const WalletGroup = memo((props: Props) => {
  const { wallets, walletType, query, title, onSelect } = props;
  const { t } = useI18n();

  const allAccounts = useUnit(accounts.$list);
  const selectedWalletId = useUnit(walletSelect.$selectedWalletId);
  const chains = useUnit(networkModel.$chains);

  const filteredWallets = performSearch({
    query,
    records: wallets,
    getMeta: wallet => ({
      allAddresses: walletSelectService.composeWalletMeta(wallet, allAccounts, chains),
    }),
    weights: { name: 1, allAddresses: 0.8 },
  });

  if (filteredWallets.length === 0) {
    return null;
  }

  const handleWalletClick = (wallet: Wallet) => {
    onSelect(wallet);
  };

  return (
    <Accordion initialOpen>
      <Accordion.Trigger>
        <div className="flex w-full items-center gap-2">
          <WalletIcon type={walletType} />
          <span>{title}</span>
          <span className="ml-auto text-text-tertiary">{filteredWallets.length}</span>
        </div>
      </Accordion.Trigger>
      <Accordion.Content>
        <Box gap={1} padding={[1, 0, 0]}>
          {filteredWallets.map(wallet => {
            const accountId = walletUtils.isRegularMultisig(wallet)
              ? wallet.accounts.find(a => accountUtils.isMultisigAccount(a))?.accountId
              : wallet.accounts.find(a => accountUtils.isFlexibleProxiedAccount(a))?.accountId;

            let chain: Chain | null = null;
            let label: string | null = null;

            if (walletUtils.isFlexibleMultisig(wallet)) {
              const chainId = wallet.accounts.find(
                account => account.accountType === AccountType.FLEX_PROXIED,
              )?.chainId;
              chain = chainId ? chains[chainId] : null;
              label = t('wallets.flexibleMultisigFlexLabel');
            }

            return (
              <WalletManagement
                key={wallet.id}
                active={selectedWalletId === wallet.id}
                wallet={wallet}
                accountId={accountId ?? null}
                description={<WalletFiatBalance wallet={wallet} className="max-w-[215px] truncate text-help-text" />}
                chain={chain}
                label={label}
                onClick={() => handleWalletClick(wallet)}
              >
                <Slot id={walletActionsSlot} props={{ wallet }} />
              </WalletManagement>
            );
          })}
        </Box>
      </Accordion.Content>
    </Accordion>
  );
});
