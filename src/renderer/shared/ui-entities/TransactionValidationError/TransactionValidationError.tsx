import { type BN, BN_ZERO } from '@polkadot/util';
import { type ReactNode, memo } from 'react';
import { Trans } from 'react-i18next';

import { categorizeXcmError, getHumanReadableXcmError } from '@/shared/api/xcm/service/xcm-error-utils';
import { TEST_IDS } from '@/shared/constants/testIds';
import { type Asset, type ProxyType, type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { formatAsset, groupBy, nonNullable, nullable } from '@/shared/lib/utils';
import { Alert, FootnoteText } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { type AnyAccount, type BalanceUpdateResult } from '@/domains/network';
import { useWalletName } from '@/domains/network';
import { ProxyTypeName } from '@/entities/proxy';
import { WalletIcon } from '../WalletIcon/WalletIcon';

const PermissionErrorItem = memo(({ wallet, permission }: { wallet: Wallet; permission: string }) => {
  const { t } = useI18n();
  const walletName = useWalletName(wallet);
  const permissionTranslationKey = ProxyTypeName[permission as ProxyType] ?? permission;

  return (
    <Box as="span" direction="row" gap={1} verticalAlign="center">
      <WalletIcon type={wallet.type} size={16} />
      <span>
        {walletName}: {t(permissionTranslationKey)}
      </span>
    </Box>
  );
});

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

export type TransactionValidationNetworkError = {
  networkError: true;
  message: string;
};

export type TransactionValidationDryRunError = {
  dryRunError: true;
  failureReason: string;
  failureChain?: string;
  chainName?: string;
  title?: string;
  description?: ReactNode;
};

type Props = {
  errors: (
    | TransactionValidationPermissionError
    | TransactionValidationBalanceError
    | TransactionValidationFatalError
    | TransactionValidationNetworkError
    | TransactionValidationDryRunError
  )[];
  wallets: Wallet[];
};

export const TransactionValidationError = memo(({ wallets, errors }: Props) => {
  const { t } = useI18n();

  const fatalErrors = errors.filter(
    (e): e is TransactionValidationFatalError => 'message' in e && !('networkError' in e),
  );
  const networkErrors = errors.filter((e): e is TransactionValidationNetworkError => 'networkError' in e);
  const dryRunErrors = errors.filter((e): e is TransactionValidationDryRunError => 'dryRunError' in e);
  const permissionErrors = errors.filter((e): e is TransactionValidationPermissionError => 'permission' in e);
  const balanceErrors = groupBy(
    errors.filter(e => 'balance' in e),
    e => e.account.id,
  );

  const errorNodes: ReactNode[] = [];

  if (fatalErrors.length > 0) {
    for (const error of fatalErrors) {
      errorNodes.push(
        <span data-testid={TEST_IDS.VALIDATIONS.FATAL}>
          {t('general.transactionErrors.fatal.intro')}
          <span className="break-all">{` ${error.message}`}</span>
        </span>,
      );
    }
  }

  if (networkErrors.length > 0) {
    for (const error of networkErrors) {
      errorNodes.push(
        <FootnoteText key="network-error" className="max-w-full break-words text-text-primary">
          {error.message}
        </FootnoteText>,
      );
    }
  }

  if (dryRunErrors.length > 0) {
    for (const error of dryRunErrors) {
      errorNodes.push(<TransactionDryRunError key="dry-run-error" error={error} />);
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

  const hasErrors = errors.length > 0;
  const renderDot = errorNodes.length > 1;
  const hasNetworkError = networkErrors.length > 0;
  const hasDryRunError = dryRunErrors.length > 0;
  const title =
    hasDryRunError && dryRunErrors[0]?.title
      ? dryRunErrors[0].title
      : hasNetworkError
        ? t('general.transactionErrors.network.title')
        : t('general.transactionErrors.title');

  if (!hasErrors) {
    return null;
  }

  return (
    <Alert active={hasErrors} variant="error" title={title}>
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

        return <PermissionErrorItem key={`${wallet.id}${e.permission}`} wallet={wallet} permission={e.permission} />;
      })}
      <span data-testid={dataTestId}>{t('general.transactionErrors.permission.message')}</span>
    </Box>
  );
};

const TransactionDryRunError = ({ error }: { error: TransactionValidationDryRunError }) => {
  const { t } = useI18n();

  if (error.description) {
    return <FootnoteText className="max-w-full break-all text-text-primary">{error.description}</FootnoteText>;
  }

  const errorInfo = categorizeXcmError(error.failureReason);
  const isTooExpensive = errorInfo.isTooExpensive;
  const isFeesNotMet = errorInfo.isFeesNotMet;
  const chainName = error.chainName || error.failureChain;
  const cleanReason = getHumanReadableXcmError(error.failureReason, error.failureChain);

  const i18nKey = isTooExpensive
    ? 'transfer.dryRunTooExpensive.description'
    : isFeesNotMet
      ? 'transfer.dryRunFeesNotMet.description'
      : cleanReason
        ? 'transfer.dryRunError.descriptionWithReason'
        : 'transfer.dryRunError.description';

  return (
    <FootnoteText className="max-w-full break-all text-text-primary">
      <Trans
        t={t}
        i18nKey={i18nKey}
        values={{
          reason: cleanReason,
          chain: chainName,
        }}
        components={isTooExpensive ? { br: <br /> } : undefined}
      />
    </FootnoteText>
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
  const walletName = useWalletName(wallet);

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
                <WalletIcon type={wallet.type} size={16} /> {walletName}
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
