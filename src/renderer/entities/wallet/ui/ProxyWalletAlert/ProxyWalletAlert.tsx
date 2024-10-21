import { Trans } from 'react-i18next';

import { type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Alert, FootnoteText } from '@/shared/ui';
import { WalletIcon } from '../WalletIcon/WalletIcon';

type Props = {
  wallet: Wallet;
  fee: string;
  balance: string;
  symbol: string;
  onClose: () => void;
};

export const ProxyWalletAlert = ({ wallet, fee, balance, symbol, onClose }: Props) => {
  const { t } = useI18n();

  const component = (
    <span className="mx-1 inline-flex max-w-[200px] items-center gap-x-1 align-bottom">
      <WalletIcon className="shrink-0" type={wallet.type} size={16} />
      <FootnoteText as="span" className="truncate text-text-secondary transition-colors">
        {wallet.name}
      </FootnoteText>
    </span>
  );

  return (
    <Alert active title={t('operation.proxyFeeErrorTitle')} variant="warn" onClose={onClose}>
      <FootnoteText className="max-w-full tracking-tight text-text-secondary">
        <Trans
          t={t}
          i18nKey="operation.proxyFeeErrorDescription"
          components={{ wallet: component }}
          values={{ fee, balance, symbol }}
        />
      </FootnoteText>
    </Alert>
  );
};
