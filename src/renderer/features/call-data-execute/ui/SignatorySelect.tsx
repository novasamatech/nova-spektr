import { BN_ZERO } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { type ReactNode, memo, useMemo } from 'react';

import { type Wallet, WalletType } from '@/shared/core';
import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { getNativeAsset, nonNullable, nullable, toAddress, transferableAmountBN } from '@/shared/lib/utils';
import { FootnoteText, InputHint } from '@/shared/ui';
import { Address, AssetBalance } from '@/shared/ui-entities';
import { Box, Field, Select } from '@/shared/ui-kit';
import { accountService } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { WalletIcon, walletModel } from '@/entities/wallet';
import { formModel } from '../model/form';

const walletTypesTitles: Record<WalletType, string> = {
  [WalletType.POLKADOT_EXTENSION]: 'wallets.polkadotExtensionLabel',
  [WalletType.WATCH_ONLY]: 'wallets.watchOnlyLabel',
  [WalletType.POLKADOT_VAULT]: 'wallets.paritySignerLabel',
  [WalletType.MULTISIG]: 'wallets.multisigLabel',
  [WalletType.FLEXIBLE_MULTISIG]: 'wallets.flexibleMultisigLabel',
  [WalletType.WALLET_CONNECT]: 'wallets.walletConnectLabel',
  [WalletType.NOVA_WALLET]: 'wallets.novaWalletLabel',
  [WalletType.PROXIED]: 'wallets.proxiedLabel',
  [WalletType.TALISMAN_EXTENSION]: 'wallets.talismanExtensionLabel',
  [WalletType.SUBWALLET_EXTENSION]: 'wallets.subWalletExtensionLabel',
  [WalletType.SINGLE_PARITY_SIGNER]: 'wallets.paritySignerLabel',
};

export const SignatorySelect = memo(() => {
  const { t } = useI18n();

  const wallets = useUnit(walletModel.$wallets);
  const signatories = useUnit(formModel.$signatories);
  const balances = useUnit(balanceModel.$balances);
  const chain = useUnit(formModel.form.fields.chain.$value);
  const {
    fields: { signatory },
  } = useForm(formModel.form);

  const asset = chain ? getNativeAsset(chain.assets) : null;

  const onChange = (walletId: string) => {
    const wallet = wallets.find((w) => w.id === Number(walletId));
    if (nonNullable(wallet) && nonNullable(chain)) {
      const walletSignatories = accountService.filterAccountsByWallet(signatories, wallet.id);
      const matchingSignatory = walletSignatories.find((account) =>
        accountService.isAccountAvailableOnChain(account, chain),
      );
      if (matchingSignatory) {
        signatory.onChange(matchingSignatory);
      }
    }
  };

  const options = useMemo(() => {
    const options: ReactNode[] = [];
    if (nullable(chain) || nullable(asset)) return options;

    const walletsByType = wallets.reduce(
      (groups, wallet) => {
        const walletSignatories = accountService.filterAccountsByWallet(signatories, wallet.id);
        const hasMatchingSignatories = walletSignatories.some((account) =>
          accountService.isAccountAvailableOnChain(account, chain),
        );
        if (!hasMatchingSignatories) return groups;

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
          const walletSignatories = accountService.filterAccountsByWallet(signatories, wallet.id);
          const firstMatchingSignatory = walletSignatories.find((account) =>
            accountService.isAccountAvailableOnChain(account, chain),
          );

          if (!firstMatchingSignatory) return null;

          const balance = balanceUtils.getBalance(
            balances,
            firstMatchingSignatory.accountId,
            chain.chainId,
            asset.assetId,
          );

          return (
            <Select.Item key={wallet.id} value={wallet.id.toString()} depth={1}>
              <Box direction="row" verticalAlign="center" horizontalAlign="space-between" gap={2}>
                <Address
                  showIcon
                  canCopy={false}
                  variant="truncate"
                  title={wallet.name}
                  address={toAddress(firstMatchingSignatory.accountId, { prefix: chain?.addressPrefix })}
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
        .filter(Boolean);

      if (walletItems.length > 0) {
        options.push(
          <Select.Group key={walletGroup.walletType} title={walletTypeTitle}>
            {walletItems}
          </Select.Group>,
        );
      }
    }

    return options;
  }, [wallets, balances, chain, asset, signatories, t]);

  const selectedSignatoryWallet = useMemo(() => {
    if (signatory.value) {
      return wallets.find((w) => w.id === signatory.value?.walletId) ?? null;
    }
    return null;
  }, [wallets, signatory.value]);

  const signatoryBalance = useMemo(() => {
    if (signatory.value && chain && asset) {
      const balance = balanceUtils.getBalance(balances, signatory.value.accountId, chain.chainId, asset.assetId);
      return transferableAmountBN(balance);
    }
    return BN_ZERO;
  }, [signatory.value, chain, asset, balances]);

  return (
    <Field text={t('callData.fields.signatory.label')}>
      <Select
        placeholder={t('callData.fields.signatory.placeholder')}
        value={selectedSignatoryWallet?.id.toString() ?? null}
        valueNode={
          nonNullable(signatory.value) && nonNullable(selectedSignatoryWallet) ? (
            <Box direction="row" verticalAlign="center" horizontalAlign="space-between" gap={2}>
              <Address
                showIcon
                canCopy={false}
                variant="truncate"
                title={selectedSignatoryWallet.name}
                address={toAddress(signatory.value.accountId, { prefix: chain?.addressPrefix })}
              />
              {nonNullable(asset) && (
                <AssetBalance className="text-footnote text-text-secondary" value={signatoryBalance} asset={asset} />
              )}
            </Box>
          ) : null
        }
        height="md"
        onChange={onChange}
      >
        {options}
      </Select>
      <InputHint variant="error" active={signatory.hasError}>
        {t(signatory.errorMessage)}
      </InputHint>
    </Field>
  );
});
