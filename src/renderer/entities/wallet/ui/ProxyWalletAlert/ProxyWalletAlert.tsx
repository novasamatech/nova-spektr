import { Trans } from 'react-i18next';

import { useI18n } from '@app/providers';
import type { Wallet_NEW } from '@shared/core';
import { FootnoteText, Alert } from '@shared/ui';
import { WalletIcon } from '../../index';

type Props = {
  wallet: Wallet_NEW;
  fee: string;
  balance: string;
  symbol: string;
  onClose: () => void;
};

export const ProxyWalletAlert = ({ wallet, fee, balance, symbol, onClose }: Props) => {
  const { t } = useI18n();

  const component = (
    <span className="inline-flex gap-x-1 items-center mx-1 align-bottom max-w-[200px]">
      <WalletIcon className="shrink-0" type={wallet.type} size={16} />
      <FootnoteText as="span" className="text-text-secondary transition-colors truncate">
        {wallet.name}
      </FootnoteText>
    </span>
  );

  return (
    <Alert active title={t('operation.proxyFeeErrorTitle')} variant="warn" onClose={onClose}>
      <FootnoteText className="text-text-secondary tracking-tight max-w-full">
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
