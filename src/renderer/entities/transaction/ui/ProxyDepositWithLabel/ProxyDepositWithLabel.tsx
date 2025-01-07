import { type ComponentProps } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { DetailRow, FootnoteText, Icon } from '@/shared/ui';
import { Tooltip } from '@/shared/ui-kit';
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
          <Tooltip>
            <Tooltip.Trigger>
              <div tabIndex={0}>
                <Icon name="info" className="cursor-pointer hover:text-icon-hover" size={16} />
              </div>
            </Tooltip.Trigger>
            <Tooltip.Content>{t('proxy.proxyDepositHint')}</Tooltip.Content>
          </Tooltip>
        </>
      }
      className={cnTw('text-text-primary', wrapperClassName)}
    >
      <ProxyDeposit {...depositProps} />
    </DetailRow>
  );
};
