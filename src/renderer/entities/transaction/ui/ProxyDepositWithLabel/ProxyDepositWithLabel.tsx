import { type ComponentProps } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { DetailRow, FootnoteText, Icon, Tooltip } from '@/shared/ui';
import { ProxyDeposit } from '../ProxyDeposit/ProxyDeposit';

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
            <Icon name="info" className="cursor-pointer hover:text-icon-hover" size={16} />
          </Tooltip>
        </>
      }
      className={cnTw('text-text-primary', wrapperClassName)}
    >
      <ProxyDeposit {...depositProps} />
    </DetailRow>
  );
};
