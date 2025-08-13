import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { AccountType, type Chain, type Wallet, WalletType } from '@/shared/core';
import { createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { WalletManagement } from '@/shared/ui-entities';
import { Accordion, Box, Checkbox } from '@/shared/ui-kit';
import { networkModel } from '@/entities/network';
import { FiatBalance } from '@/entities/price';
import { WalletIcon, walletUtils } from '@/entities/wallet';
import { hiddenWalletsBalancesModel } from '../model/balances';

export const walletActionsSlot = createSlot<{ wallet: Wallet }>();

type Props = {
  walletType: WalletType;
  wallets: Wallet[];
  selectedWallets: Wallet[];
  onGroupToggle: (wallets: Wallet[]) => void;
  onWalletToggle: (wallet: Wallet) => void;
};

const WALLET_TYPE_LABELS = {
  [WalletType.MULTISIG]: 'wallets.multisigLabel',
  [WalletType.FLEXIBLE_MULTISIG]: 'wallets.flexibleMultisigLabel',
  [WalletType.POLKADOT_EXTENSION]: 'wallets.polkadotExtensionLabel',
  [WalletType.WATCH_ONLY]: 'wallets.watchOnlyLabel',
  [WalletType.PROXIED]: 'wallets.proxiedLabel',
  [WalletType.NOVA_WALLET]: 'wallets.novaWalletLabel',
  [WalletType.WALLET_CONNECT]: 'wallets.walletConnectLabel',
  [WalletType.POLKADOT_VAULT]: 'wallets.paritySignerLabel',
  [WalletType.TALISMAN_EXTENSION]: 'wallets.talismanExtensionLabel',
  [WalletType.SUBWALLET_EXTENSION]: 'wallets.subWalletExtensionLabel',
};

export const WalletGroup = (props: Props) => {
  const { wallets, walletType, selectedWallets, onGroupToggle, onWalletToggle } = props;
  const { t } = useI18n();

  const chains = useUnit(networkModel.$chains);
  const balances = useUnit(hiddenWalletsBalancesModel.$balances);

  // Optimized Set for O(1) selection lookups
  const selectedWalletSet = useMemo(() => new Set(selectedWallets), [selectedWallets]);

  // Checkbox state logic for multiple select
  const groupCheckboxState = useMemo(() => {
    const selectedInGroup = wallets.filter((wallet) => selectedWalletSet.has(wallet));

    if (selectedInGroup.length === 0) {
      return { checked: false, semiChecked: false };
    } else if (selectedInGroup.length === wallets.length) {
      return { checked: true, semiChecked: false };
    } else {
      return { checked: false, semiChecked: true };
    }
  }, [selectedWalletSet, wallets]);

  if (wallets.length === 0) {
    return null;
  }

  const handleGroupCheckboxChange = () => {
    onGroupToggle(wallets);
  };

  const handleWalletClick = (wallet: Wallet) => {
    onWalletToggle(wallet);
  };

  return (
    <Box padding={[1, 0, 0]}>
      <Accordion initialOpen>
        <Accordion.Trigger>
          <div className="flex w-full items-center gap-2">
            <Checkbox
              checked={groupCheckboxState.checked}
              semiChecked={groupCheckboxState.semiChecked}
              onChange={handleGroupCheckboxChange}
              onClick={(e) => e.stopPropagation()}
            />
            <WalletIcon type={walletType} />
            <span>{t(WALLET_TYPE_LABELS[walletType as keyof typeof WALLET_TYPE_LABELS])}</span>
            <span className="ml-auto text-text-tertiary">{wallets.length}</span>
          </div>
        </Accordion.Trigger>
        <Accordion.Content>
          <Box gap={1} padding={[1, 0, 0]}>
            {wallets.map((wallet) => {
              const address = wallet.accounts[0]?.accountId;
              const isSelected = selectedWalletSet.has(wallet);

              let chain: Chain | null = null;
              let label: string | null = null;

              if (walletUtils.isFlexibleMultisig(wallet)) {
                const chainId = wallet.accounts.find(
                  (account) => account.accountType === AccountType.FLEX_PROXIED,
                )?.chainId;
                chain = chainId ? chains[chainId] : null;
                label = t('wallets.flexibleMultisigFlexLabel');
              }

              return (
                <div key={wallet.id} className="flex items-center gap-2">
                  <div className="flex-1">
                    <WalletManagement
                      wallet={wallet}
                      address={address}
                      checkBox={
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleWalletClick(wallet)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      }
                      description={<FiatBalance amount={balances[wallet.id].toString()} />}
                      chain={chain}
                      label={label}
                      onClick={() => handleWalletClick(wallet)}
                    />
                  </div>
                </div>
              );
            })}
          </Box>
        </Accordion.Content>
      </Accordion>
    </Box>
  );
};
