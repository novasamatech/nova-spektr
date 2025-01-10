import { type PropsWithChildren } from 'react';

import { useI18n } from '@/shared/i18n';
import { DetailRow, FootnoteText, Icon } from '@/shared/ui';
import { Tooltip } from '@/shared/ui-kit';

export const ProxyDepositLabel = ({ children }: PropsWithChildren) => {
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
            <Tooltip.Content>{t('proxy.proxyDepositHint')} </Tooltip.Content>
          </Tooltip>
        </>
      }
      className="text-text-primary"
    >
      {children}
    </DetailRow>
  );
};
