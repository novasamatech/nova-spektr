import { useUnit } from 'effector-react';
import { memo, useEffect, useMemo } from 'react';

import { AccountType, type Chain, type Wallet, type WalletType } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { performSearch } from '@/shared/lib/utils';
import { WalletManagement } from '@/shared/ui-entities';
import { Accordion, Box, Checkbox } from '@/shared/ui-kit';
import { accounts } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { WalletIcon, walletUtils } from '@/entities/wallet';
import { walletSelectService } from '@/aggregates/wallet-select';
import { walletsFiatBalanceFeature } from '@/features/wallet-fiat-balance';

const { WalletFiatBalance } = walletsFiatBalanceFeature.views;

export const walletActionsSlot = createSlot<{ wallet: Wallet }>();

type BaseProps = {
  title: string;
  walletType: WalletType;
  wallets: Wallet[];
  query: string;
};

type SingleSelectProps = BaseProps & {
  isMultipleSelect?: false;
  onSelect: (wallet: Wallet) => unknown;
  selectedWalletIds?: never;
  onGroupToggle?: never;
  onWalletToggle?: never;
};

type MultiSelectProps = BaseProps & {
  isMultipleSelect: true;
  onSelect: (wallets: Wallet[]) => unknown;
  selectedWalletIds: Wallet[];
  onGroupToggle: (wallets: Wallet[]) => void;
  onWalletToggle: (wallet: Wallet) => void;
  setSearchResults?: (wallets: Wallet[]) => void;
};

type Props = SingleSelectProps | MultiSelectProps;

export const WalletGroup = memo((props: Props) => {
  const { wallets, walletType, query, title, onSelect, isMultipleSelect } = props;
  const { t } = useI18n();

  const allAccounts = useUnit(accounts.$list);
  const chains = useUnit(networkModel.$chains);

  const filteredWallets = performSearch({
    query,
    records: wallets,
    getMeta: wallet => ({
      allAddresses: walletSelectService.composeWalletMeta(wallet, allAccounts, chains),
    }),
    weights: { name: 1, allAddresses: 0.8 },
  });

  useEffect(() => {
    if (isMultipleSelect && props.setSearchResults) {
      props.setSearchResults(filteredWallets);
    }
  }, [filteredWallets, isMultipleSelect, props]);

  // Optimized Set for O(1) selection lookups
  const selectedWalletIdsSet = useMemo(() => {
    return isMultipleSelect ? new Set(props.selectedWalletIds) : new Set();
  }, [isMultipleSelect, props.selectedWalletIds]);

  // Checkbox state logic for multiple select
  const groupCheckboxState = useMemo(() => {
    if (!isMultipleSelect) return { checked: false, semiChecked: false };

    const walletIds = filteredWallets.map(w => w.id);
    const selectedInGroup = walletIds.filter(id => selectedWalletIdsSet.has(id));

    if (selectedInGroup.length === 0) {
      return { checked: false, semiChecked: false };
    } else if (selectedInGroup.length === walletIds.length) {
      return { checked: true, semiChecked: false };
    } else {
      return { checked: false, semiChecked: true };
    }
  }, [isMultipleSelect, selectedWalletIdsSet, filteredWallets]);

  if (filteredWallets.length === 0) {
    return null;
  }

  const handleGroupCheckboxChange = () => {
    if (!isMultipleSelect) return;

    props.onGroupToggle(filteredWallets);
  };

  const handleWalletClick = (wallet: Wallet) => {
    if (isMultipleSelect) {
      props.onWalletToggle(wallet);
      return;
    }

    onSelect(wallet);
  };

  return (
    <Box padding={[1, 0, 0]}>
      <Accordion initialOpen>
        <Accordion.Trigger>
          <div className="flex w-full items-center gap-2">
            {isMultipleSelect && (
              <Checkbox
                checked={groupCheckboxState.checked}
                semiChecked={groupCheckboxState.semiChecked}
                onChange={handleGroupCheckboxChange}
                onClick={e => e.stopPropagation()}
              />
            )}
            <WalletIcon type={walletType} />
            <span>{title}</span>
            <span className="ml-auto text-text-tertiary">{filteredWallets.length}</span>
          </div>
        </Accordion.Trigger>
        <Accordion.Content>
          <Box gap={1} padding={[1, 0, 0]}>
            {filteredWallets.map(wallet => {
              const address = wallet.accounts[0]?.accountId;
              const isSelected = isMultipleSelect ? selectedWalletIdsSet.has(wallet.id) : false;

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
                <div key={wallet.id} className="flex items-center gap-2">
                  <div className="flex-1">
                    <WalletManagement
                      wallet={wallet}
                      address={address}
                      checkBox={
                        isMultipleSelect && (
                          <Checkbox
                            checked={isSelected}
                            onChange={() => handleWalletClick(wallet)}
                            onClick={e => e.stopPropagation()}
                          />
                        )
                      }
                      description={
                        <WalletFiatBalance walletId={wallet.id} className="max-w-[215px] truncate text-help-text" />
                      }
                      chain={chain}
                      label={label}
                      onClick={() => handleWalletClick(wallet)}
                    >
                      {!isMultipleSelect && <Slot id={walletActionsSlot} props={{ wallet }} />}
                    </WalletManagement>
                  </div>
                </div>
              );
            })}
          </Box>
        </Accordion.Content>
      </Accordion>
    </Box>
  );
});
