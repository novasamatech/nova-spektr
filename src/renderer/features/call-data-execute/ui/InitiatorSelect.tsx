import { useUnit } from 'effector-react';
import { type ReactNode, memo, useMemo, useState } from 'react';

import { type Wallet, type WalletType } from '@/shared/core';
import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import {
  getNativeAsset,
  nonNullable,
  nullable,
  performSearch,
  toAddress,
  transferableAmountBN,
} from '@/shared/lib/utils';
import { FootnoteText, InputHint } from '@/shared/ui';
import { Address, AssetBalance, WalletIcon } from '@/shared/ui-entities';
import { Box, Field, Select } from '@/shared/ui-kit';
import { accountService } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { walletModel } from '@/entities/wallet';
import { formModel } from '../model/form';

import { walletTypesTitles } from './titles';

export const InitiatorSelect = memo(() => {
  const { t } = useI18n();

  const wallets = useUnit(walletModel.$wallets);
  const allAccounts = useUnit(walletModel.$availableAccounts);
  const balancesMap = useUnit(balanceModel.$balanceMap);
  const chain = useUnit(formModel.form.fields.chain.$value);
  const {
    fields: { initiator },
  } = useForm(formModel.form);

  const [searchQuery, setSearchQuery] = useState('');
  const asset = chain ? getNativeAsset(chain.assets) : null;

  const onChange = (walletId: string) => {
    const wallet = wallets.find((w) => w.id === Number(walletId));
    if (nonNullable(wallet) && nonNullable(chain)) {
      const walletAccounts = accountService.filterAccountsByWallet(allAccounts, wallet.id);
      const matchingAccount = walletAccounts.find((account) =>
        accountService.isAccountAvailableOnChain(account, chain),
      );
      const accountToUse = matchingAccount ?? walletAccounts[0] ?? null;
      initiator.onChange(accountToUse);
    }
  };

  const options = useMemo(() => {
    const options: ReactNode[] = [];
    if (nullable(chain) || nullable(asset)) return options;

    // Filter wallets based on search query
    const filteredWallets = searchQuery
      ? performSearch({
          query: searchQuery.trim(),
          records: wallets,
          getMeta: (wallet) => ({
            name: wallet.name,
            allAddresses: accountService
              .filterAccountsByWallet(allAccounts, wallet.id)
              .map((account) => toAddress(account.accountId, { prefix: chain.addressPrefix }))
              .join(' '),
          }),
          weights: {
            name: 1,
            allAddresses: 0.8,
          },
        })
      : wallets;

    const walletsByType = filteredWallets.reduce(
      (groups, wallet) => {
        const walletAccounts = accountService.filterAccountsByWallet(allAccounts, wallet.id);
        const hasMatchingAccounts = walletAccounts.some((account) =>
          accountService.isAccountAvailableOnChain(account, chain),
        );

        if (!hasMatchingAccounts) return groups;

        if (!groups[wallet.type]) {
          groups[wallet.type] = { walletType: wallet.type, wallets: [] };
        }
        groups[wallet.type].wallets.push(wallet);
        return groups;
      },
      {} as Record<string, { walletType: WalletType; wallets: Wallet[] }>,
    );

    for (const walletGroup of Object.values(walletsByType)) {
      const walletTypeTitle = (
        <Box direction="row" gap={2} padding={[1, 0]} verticalAlign="center">
          <WalletIcon type={walletGroup.walletType} />
          <FootnoteText className="text-text-secondary uppercase">
            {t(walletTypesTitles[walletGroup.walletType])}
          </FootnoteText>
        </Box>
      );

      const walletItems = walletGroup.wallets
        .map((wallet) => {
          const walletAccounts = accountService.filterAccountsByWallet(allAccounts, wallet.id);
          const firstMatchingAccount = walletAccounts.find((account) =>
            accountService.isAccountAvailableOnChain(account, chain),
          );

          if (!firstMatchingAccount) return null;

          const balance = balanceUtils.getBalance(
            balancesMap,
            firstMatchingAccount.accountId,
            chain.chainId,
            asset.assetId,
          );

          return (
            <Select.Item key={wallet.id} value={wallet.id.toString()} indent={1}>
              <Box direction="row" verticalAlign="center" horizontalAlign="space-between" gap={2} width="100%">
                <Address
                  showIcon
                  canCopy={false}
                  variant="truncate"
                  title={wallet.name}
                  address={toAddress(firstMatchingAccount.accountId, { prefix: chain?.addressPrefix })}
                />
                <AssetBalance
                  className="text-footnote text-text-secondary"
                  value={transferableAmountBN(balance)}
                  asset={asset}
                />
              </Box>
            </Select.Item>
          );
        })
        .filter(nonNullable);

      if (walletItems.length > 0) {
        options.push(
          <Select.Group key={walletGroup.walletType} title={walletTypeTitle}>
            {walletItems}
          </Select.Group>,
        );
      }
    }

    return options;
  }, [wallets, balancesMap, chain, asset, allAccounts, searchQuery, t]);

  const selectedWallet = useMemo(() => {
    if (initiator.value) {
      return wallets.find((w) => w.id === initiator.value?.walletId) ?? null;
    }
    return null;
  }, [wallets, initiator.value]);

  return (
    <Field text={t('callData.fields.initiator.label')}>
      <Select
        placeholder={t('callData.fields.initiator.placeholder')}
        value={selectedWallet?.id.toString() ?? null}
        height="md"
        onSearch={setSearchQuery}
        onChange={onChange}
      >
        {options}
      </Select>
      <InputHint variant="error" active={initiator.hasError}>
        {t(initiator.errorMessage)}
      </InputHint>
    </Field>
  );
});
