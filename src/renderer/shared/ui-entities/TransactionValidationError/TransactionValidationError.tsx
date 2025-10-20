import { type BN, BN_ZERO } from '@polkadot/util';
import { type ReactNode, memo } from 'react';
import { Trans } from 'react-i18next';

import { TEST_IDS } from '@/shared/constants/testIds';
import { type Asset, type ProxyType, type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { formatAsset, groupBy, nonNullable, nullable } from '@/shared/lib/utils';
import { Alert } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { type AnyAccount, type BalanceUpdateResult } from '@/domains/network';
import { ProxyTypeName } from '@/entities/proxy';
import { WalletIcon } from '../WalletIcon/WalletIcon';

export type TransactionValidationFatalError = {
  message: string;
};

export type TransactionValidationPermissionError = {
  account: AnyAccount;
  permission: string;
};

export type TransactionValidationBalanceError = {
  account: AnyAccount;
  action: string;
  balance: BalanceUpdateResult;
  asset: Asset;
};

type Props = {
  errors: (
    | TransactionValidationPermissionError
    | TransactionValidationBalanceError
    | TransactionValidationFatalError
  )[];
  wallets: Wallet[];
};

export const TransactionValidationError = memo(({ wallets, errors }: Props) => {
  const { t } = useI18n();

  if (errors.length === 0) return null;

  const fatalErrors = errors.filter(e => 'message' in e);
  const permissionErrors = errors.filter(e => 'permission' in e);
  const balanceErrors = groupBy(
    errors.filter(e => 'balance' in e),
    e => e.account.id,
  );

  const errorNodes: ReactNode[] = [];

  if (fatalErrors.length > 0) {
    for (const error of fatalErrors) {
      errorNodes.push(
        <span data-testid={TEST_IDS.VALIDATIONS.FATAL}>
          <span className="font-bold">{t('general.transactionErrors.fatal.intro')}</span>
          <br />
          <span className="break-all">{error.message}</span>
        </span>,
      );
    }
  }

  if (permissionErrors.length > 0) {
    errorNodes.push(
      <TransactionPermissionError
        dataTestId={TEST_IDS.VALIDATIONS.PERMISSION}
        wallets={wallets}
        errors={permissionErrors}
      />,
    );
  }

  for (const errors of Object.values(balanceErrors)) {
    if (nullable(errors)) continue;
    errorNodes.push(
      <TransactionBalanceError dataTestId={TEST_IDS.VALIDATIONS.BALANCE} wallets={wallets} errors={errors} />,
    );
  }

  const renderDot = errorNodes.length > 1;

  return (
    <Alert active variant="error" title={t('general.transactionErrors.title')}>
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
  dataTestId,
}: {
  wallets: Wallet[];
  errors: TransactionValidationPermissionError[];
  dataTestId?: string;
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
      <span data-testid={dataTestId}>{t('general.transactionErrors.permission.message')}</span>
    </Box>
  );
};

const TransactionBalanceError = ({
  wallets,
  errors,
  dataTestId,
}: {
  wallets: Wallet[];
  errors: TransactionValidationBalanceError[];
  dataTestId?: string;
}) => {
  const { t } = useI18n();

  const account = errors.at(0)?.account;
  if (nullable(account)) return null;
  const wallet = wallets.find(w => w.id === account.walletId);
  if (nullable(wallet)) return null;

  const assetGroups = groupBy(errors, e => e.asset.symbol);
  const groupedByActionErrors = groupBy(errors, e => `${e.action}_${e.asset.symbol}`);

  const imbalances: { asset: Asset; imbalance: BN }[] = [];

  for (const assetGroup of Object.values(assetGroups)) {
    if (nullable(assetGroup)) continue;

    const firstError = assetGroup.at(-1);
    if (nullable(firstError)) continue;

    const totalImbalance = assetGroup.reduce((acc, e) => {
      return e.balance.success === false ? acc.add(e.balance.imbalance) : acc;
    }, BN_ZERO);

    if (!totalImbalance.isZero()) {
      imbalances.push({
        imbalance: totalImbalance,
        asset: firstError.asset,
      });
    }
  }

  const groupedErrors = Object.values(groupedByActionErrors)
    .map(errors => {
      if (nullable(errors)) return null;

      const action = errors.at(0)?.action;
      const asset = errors.at(0)?.asset;
      if (nullable(action) || nullable(asset)) return null;

      const required = errors.reduce((acc, e) => e.balance.required.add(acc), BN_ZERO);

      return { required, action, asset };
    })
    .filter(nonNullable);

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
        {groupedErrors
          .flatMap(({ asset, action, required }, index) => {
            return [
              <Trans
                key={index}
                t={t}
                i18nKey="general.transactionErrors.balance.section"
                parent="span"
                data-testid={`${TEST_IDS.VALIDATIONS.BALANCE}:${action}`}
                values={{
                  action: action,
                  balance: formatAsset(required, asset),
                }}
              />,
              <span key={index + 100}>, </span>,
            ];
          })
          .slice(0, -1)}
      </span>
      <span data-testid={dataTestId}>
        {t('general.transactionErrors.balance.required', {
          balances: imbalances.map(({ asset, imbalance }) => formatAsset(imbalance, asset, { round: 'up' })).join(', '),
        })}
      </span>
    </Box>
  );
};
