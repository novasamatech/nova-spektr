import { type BN } from '@polkadot/util';
import { type ReactNode, memo } from 'react';
import { Trans } from 'react-i18next';

import { type Asset, type ProxyType, type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { formatAsset, groupBy, nullable } from '@/shared/lib/utils';
import { Alert } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { type AnyAccount, type BalanceUpdateResult } from '@/domains/network';
import { ProxyTypeName } from '@/entities/proxy';
import { WalletIcon } from '../WalletIcon/WalletIcon';

export type TransactionValidationPermissionError = {
  account: AnyAccount;
  permission: string;
};

export type TransactionValidationBalanceError = {
  account: AnyAccount;
  action: string;
  required: BN;
  balance: BalanceUpdateResult;
  asset: Asset;
};

type Props = {
  errors: (TransactionValidationPermissionError | TransactionValidationBalanceError)[];
  wallets: Wallet[];
};

export const TransactionValidationError = memo(({ wallets, errors }: Props) => {
  if (errors.length === 0) return null;

  const permissionErrors = errors.filter(e => 'permission' in e);
  const balanceErrors = groupBy(
    errors.filter(e => 'balance' in e),
    e => e.account.id,
  );

  const errorNodes: ReactNode[] = [];

  if (permissionErrors.length > 0) {
    errorNodes.push(<TransactionPermissionError wallets={wallets} errors={permissionErrors} />);
  }

  for (const errors of Object.values(balanceErrors)) {
    if (nullable(errors)) continue;
    errorNodes.push(<TransactionBalanceError wallets={wallets} errors={errors} />);
  }

  const renderDot = errorNodes.length > 1;

  return (
    <Alert active variant="error" title="This operation cannot be completed">
      <Box as="span" gap={2}>
        {errorNodes.map((n, i) => (
          <Alert.Item key={i} withDot={renderDot}>
            {n}
          </Alert.Item>
        ))}
      </Box>
    </Alert>
  );
});

const TransactionPermissionError = ({
  wallets,
  errors,
}: {
  wallets: Wallet[];
  errors: TransactionValidationPermissionError[];
}) => {
  const { t } = useI18n();

  return (
    <Box as="span" gap={0.5}>
      <span>{t('general.transactionErrors.permission.intro')}</span>
      {errors.map(e => {
        const wallet = wallets.find(w => w.id === e.account.walletId);
        if (nullable(wallet)) return null;

        const permissionTranslationKey = ProxyTypeName[e.permission as ProxyType] ?? e.permission;

        return (
          <Box key={`${wallet.name}${e.permission}`} as="span" direction="row" gap={1} verticalAlign="center">
            <WalletIcon type={wallet.type} size={16} />
            <span>
              {wallet.name}: {t(permissionTranslationKey)}
            </span>
          </Box>
        );
      })}
      <span>{t('general.transactionErrors.permission.message')}</span>
    </Box>
  );
};

const TransactionBalanceError = ({
  wallets,
  errors,
}: {
  wallets: Wallet[];
  errors: TransactionValidationBalanceError[];
}) => {
  const { t } = useI18n();

  const account = errors.at(0)?.account;
  if (nullable(account)) return null;
  const wallet = wallets.find(w => w.id === account.walletId);
  if (nullable(wallet)) return null;

  const assetGroups = groupBy(errors, e => e.asset.assetId);

  const imbalances: { asset: Asset; imbalance: BN }[] = [];

  for (const assetGroup of Object.values(assetGroups)) {
    if (nullable(assetGroup)) continue;
    const lastImbalance = assetGroup.at(-1);
    if (nullable(lastImbalance)) continue;

    if (lastImbalance.balance.success === false) {
      imbalances.push({
        imbalance: lastImbalance.balance.imbalance,
        asset: lastImbalance.asset,
      });
    }
  }

  return (
    <Box as="span" gap={0.5}>
      <span>
        <Trans
          t={t}
          i18nKey="general.transactionErrors.balance.intro"
          components={{
            wallet: (
              <span className="relative top-1 -mt-1 inline-flex items-center gap-1">
                <WalletIcon type={wallet.type} size={16} /> {wallet.name}
              </span>
            ),
          }}
        />{' '}
        {errors
          .flatMap((e, index) => {
            return [
              <Trans
                key={index}
                t={t}
                i18nKey="general.transactionErrors.balance.section"
                values={{
                  action: e.action,
                  balance: formatAsset(e.required, e.asset),
                }}
              />,
              <span key={index + 100}>, </span>,
            ];
          })
          .slice(0, -1)}
      </span>
      <span>
        {t('general.transactionErrors.balance.required', {
          balances: imbalances.map(({ asset, imbalance }) => formatAsset(imbalance, asset, { round: 'up' })).join(', '),
        })}
      </span>
    </Box>
  );
};
