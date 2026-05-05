import { useUnit } from 'effector-react';
import { type ReactNode, memo, useMemo } from 'react';

import { type Wallet, type WalletType } from '@/shared/core';
import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { getNativeAsset, nonNullable, nullable, toAddress, transferableAmountBN } from '@/shared/lib/utils';
import { FootnoteText, InputHint } from '@/shared/ui';
import { Address, AssetBalance, WalletIcon } from '@/shared/ui-entities';
import { Box, Field, Select } from '@/shared/ui-kit';
import { accountService, useWalletsNames } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { walletModel } from '@/entities/wallet';
import { SigningPathControl } from '@/features/signing-path';
import { formModel } from '../model/form';

import { walletTypesTitles } from './titles';

export const SignatorySelect = memo(() => {
  const { t } = useI18n();

  const wallets = useUnit(walletModel.$wallets);
  const resolvedWallets = useWalletsNames(wallets);
  const signatories = useUnit(formModel.$signatories);
  const signingPath = useUnit(formModel.$signingPath);
  const balancesMap = useUnit(balanceModel.$balanceMap);
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

    const walletsByType = resolvedWallets.reduce(
      (groups, wallet) => {
        const walletSignatories = accountService.filterAccountsByWallet(signatories, wallet.id);
        const hasMatchingSignatories = walletSignatories.some((account) =>
          accountService.isAccountAvailableOnChain(account, chain),
        );
        if (!hasMatchingSignatories) return groups;

        if (!groups[wallet.type]) {
          groups[wallet.type] = { walletType: wallet.type, wallets: [] };
        }
        groups[wallet.type]!.wallets.push(wallet);
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
            balancesMap,
            firstMatchingSignatory.accountId,
            chain.chainId,
            asset.assetId,
          );

          return (
            <Select.Item key={wallet.id} value={wallet.id.toString()} indent={1}>
              <Box direction="row" verticalAlign="center" horizontalAlign="space-between" width="100%">
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
  }, [resolvedWallets, balancesMap, chain, asset, signatories, t]);

  const selectedSignatoryWallet = useMemo(() => {
    if (signatory.value) {
      return wallets.find((w) => w.id === signatory.value?.walletId) ?? null;
    }
    return null;
  }, [wallets, signatory.value]);

  const pathChip = chain ? (
    <SigningPathControl chainId={chain.chainId} path={signingPath} onChange={formModel.signingPathChanged} />
  ) : null;

  return (
    <Field text={t('callData.fields.signatory.label')} action={pathChip}>
      <Select
        placeholder={t('callData.fields.signatory.placeholder')}
        value={selectedSignatoryWallet?.id.toString() ?? null}
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
