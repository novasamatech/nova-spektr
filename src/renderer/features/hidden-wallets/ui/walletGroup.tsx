import { useUnit } from 'effector-react';
import { t } from 'i18next';
import { useMemo } from 'react';

import { type Chain, type Wallet, WalletType } from '@/shared/core';
import { createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { WalletIcon, WalletManagement } from '@/shared/ui-entities';
import { Accordion, Box, Checkbox } from '@/shared/ui-kit';
import { networkModel } from '@/entities/network';
import { accountUtils, walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { FiatBalance } from '@/widgets/price';
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
  [WalletType.MULTISIG]: t('wallets.multisigLabel'),
  [WalletType.FLEXIBLE_MULTISIG]: t('wallets.flexibleMultisigLabel'),
  [WalletType.POLKADOT_EXTENSION]: t('wallets.polkadotExtensionLabel'),
  [WalletType.WATCH_ONLY]: t('wallets.watchOnlyLabel'),
  [WalletType.PROXIED]: t('wallets.proxiedLabel'),
  [WalletType.NOVA_WALLET]: t('wallets.novaWalletLabel'),
  [WalletType.WALLET_CONNECT]: t('wallets.walletConnectLabel'),
  [WalletType.POLKADOT_VAULT]: t('wallets.paritySignerLabel'),
  [WalletType.TALISMAN_EXTENSION]: t('wallets.talismanExtensionLabel'),
  [WalletType.SUBWALLET_EXTENSION]: t('wallets.subWalletExtensionLabel'),
};

export const WalletGroup = (props: Props) => {
  const { wallets, walletType, selectedWallets, onGroupToggle, onWalletToggle } = props;
  const { t } = useI18n();

  const chains = useUnit(networkModel.$chains);
  const selectedWalletId = useUnit(walletSelect.$selectedWalletId);
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
            const accountId = wallet.accounts.at(0)?.accountId;
            const isSelected = selectedWalletSet.has(wallet);

            let chain: Chain | null = null;
            let label: string | null = null;

            // TODO incorrect connection between features, this data should be inserted other way, by slot on smth
            if (walletUtils.isFlexibleMultisig(wallet)) {
              const chainId = wallet.accounts.find(accountUtils.isFlexibleMultisigAccount)?.chainId;
              chain = chainId ? chains[chainId]! : null;
              label = t('wallets.flexibleMultisigFlexLabel');
            }

            return (
              <WalletManagement
                key={wallet.id}
                active={selectedWalletId === wallet.id}
                wallet={wallet}
                accountId={accountId ?? null}
                checkBox={
                  <Checkbox
                    checked={isSelected}
                    onChange={() => handleWalletClick(wallet)}
                    onClick={(e) => e.stopPropagation()}
                  />
                }
                description={<FiatBalance amount={balances[wallet.id]!.toString()} />}
                chain={chain}
                label={label}
                onClick={() => handleWalletClick(wallet)}
              />
            );
          })}
        </Box>
      </Accordion.Content>
    </Accordion>
  );
};
