import { Trans } from 'react-i18next';

import { type Address } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Alert, FootnoteText } from '@/shared/ui';
import { Hash, Identicon } from '@/shared/ui-entities';

type Props = {
  address: Address;
  fee: string;
  balance: string;
  symbol: string;
  onClose: () => void;
};

export const DeliveryFeeAlert = ({ address, fee, balance, symbol, onClose }: Props) => {
  const { t } = useI18n();

  const component = (
    <span className="text-footnote text-text-secondary mx-1 inline-flex items-center gap-x-1 align-bottom">
      <Identicon address={address} size={16} background={false} />
      <Hash value={address} variant="short" />
    </span>
  );

  return (
    <Alert active title={t('operation.deliveryFeeErrorTitle')} variant="error" onClose={onClose}>
      <FootnoteText className="text-text-secondary max-w-full tracking-tight">
        <Trans
          t={t}
          i18nKey="operation.deliveryFeeErrorDescription"
          components={{ account: component }}
          values={{ fee, balance, symbol }}
        />
      </FootnoteText>
    </Alert>
  );
};
