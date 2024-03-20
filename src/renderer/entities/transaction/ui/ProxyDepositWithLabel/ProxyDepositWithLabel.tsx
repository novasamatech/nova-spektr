import { ComponentProps } from 'react';

import { useI18n } from '@app/providers';
import { Icon, FootnoteText, Tooltip, DetailRow } from '@shared/ui';
import { ProxyDeposit } from '../ProxyDeposit/ProxyDeposit';
import { cnTw } from '@shared/lib/utils';

type Props = ComponentProps<typeof ProxyDeposit> & {
  wrapperClassName?: string;
};

export const ProxyDepositWithLabel = ({ wrapperClassName, ...depositProps }: Props) => {
  const { t } = useI18n();

  return (
    <DetailRow
      label={
        <>
          <Icon className="text-text-tertiary" name="lock" size={12} />
          <FootnoteText className="text-text-tertiary">{t('proxy.proxyDepositLabel')}</FootnoteText>
          <Tooltip content={t('proxy.proxyDepositHint')} offsetPx={-60}>
            <Icon name="info" className="hover:text-icon-hover cursor-pointer" size={16} />
          </Tooltip>
        </>
      }
      className={cnTw('text-text-primary', wrapperClassName)}
    >
      <ProxyDeposit {...depositProps} />
    </DetailRow>
  );
};
