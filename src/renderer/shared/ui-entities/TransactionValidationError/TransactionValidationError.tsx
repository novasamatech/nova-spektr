import { type BN } from '@polkadot/util';
import { type ReactNode, memo } from 'react';
import { Trans } from 'react-i18next';

import { type Asset, type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { formatAsset } from '@/shared/lib/utils';
import { Alert } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { WalletIcon } from '../WalletIcon/WalletIcon';

export type TransactionValidationPermissionError = {
  type: 'permission';
  wallet: Wallet;
  permission: string;
};

type BalanceWithdrawalInfo = {
  action: string;
  balance: BN;
  asset: Asset;
};

export type TransactionValidationBalanceError = {
  type: 'balance';
  wallet: Wallet;
  withdrawals: BalanceWithdrawalInfo[];
};

type Props = {
  errors: (TransactionValidationPermissionError | TransactionValidationBalanceError)[];
};

export const TransactionValidationError = memo(({ errors }: Props) => {
  const { t } = useI18n();
  const permissionErrors = errors.filter(e => e.type === 'permission');
  const balanceErrors = errors.filter(e => e.type === 'balance');

  const errorNodes: ReactNode[] = [];

  if (permissionErrors.length > 0) {
    errorNodes.push(
      <Box key="permission" as="span" gap={0.5}>
        <span>{t('general.transactionErrors.permission.intro')}</span>
        {permissionErrors.map(e => (
          <Box key={`${e.wallet.name}${e.permission}`} as="span" direction="row" gap={1} verticalAlign="center">
            <WalletIcon type={e.wallet.type} size={16} />
            <span>
              {e.wallet.name}: {e.permission}
            </span>
          </Box>
        ))}
        <span>{t('general.transactionErrors.permission.message')}</span>
      </Box>,
    );
  }

  for (const [index, error] of balanceErrors.entries()) {
    errorNodes.push(<TransactionBalanceError key={`balance${index}`} error={error} />);
  }

  return (
    <Alert active variant="error" title="This operation cannot be completed">
      <Box as="span" gap={2}>
        {errorNodes.map((n, i) => (
          <Alert.Item key={i} withDot={errorNodes.length > 1}>
            {n}
          </Alert.Item>
        ))}
      </Box>
    </Alert>
  );
});

const TransactionBalanceError = ({ error }: { error: TransactionValidationBalanceError }) => {
  const { t } = useI18n();

  return (
    <Box as="span" gap={0.5}>
      <span>
        <Trans
          t={t}
          i18nKey="general.transactionErrors.balance.intro"
          components={{
            wallet: (
              <span className="relative top-1 -mt-1 inline-flex items-center gap-1">
                <WalletIcon type={error.wallet.type} size={16} /> {error.wallet.name}
              </span>
            ),
          }}
        />{' '}
        {error.withdrawals
          .flatMap((w, index) => {
            return [
              <Trans
                key={index}
                t={t}
                i18nKey="general.transactionErrors.balance.section"
                values={{
                  action: w.action,
                  balance: formatAsset(w.balance, w.asset),
                }}
              />,
              <span key={index + 100}>, </span>,
            ];
          })
          .slice(0, -1)}
      </span>
      <span>
        {t('general.transactionErrors.balance.required')}{' '}
        {error.withdrawals
          .flatMap((w, index) => {
            return [
              <span key={index} className="whitespace-nowrap">
                {formatAsset(w.balance, w.asset)}
              </span>,
              <span key={index + 100}>, </span>,
            ];
          })
          .slice(0, -1)}
        .
      </span>
      <span>{t('general.transactionErrors.balance.message')}</span>
    </Box>
  );
};
