import { ComponentProps } from 'react';

import { useI18n } from '@renderer/context/I18nContext';
import { Icon } from '@renderer/components/ui';
import { FootnoteText, Tooltip } from '@renderer/components/ui-redesign';
import { Deposit, DetailRow } from '@renderer/components/common';

export const DepositWithLabel = ({ ...depositProps }: ComponentProps<typeof Deposit>) => {
  const { t } = useI18n();

  return (
    <DetailRow
      label={
        <>
          <Icon className="text-text-tertiary" name="lock" size={12} />
          <FootnoteText className="text-text-tertiary">{t('staking.networkDepositLabel')}</FootnoteText>
          <Tooltip content={t('staking.tooltips.depositDescription')} offsetPx={-90} pointer="down">
            <Icon name="info" className="hover:text-icon-hover cursor-pointer" size={16} />
          </Tooltip>
        </>
      }
      className="text-text-primary"
    >
      <Deposit {...depositProps} />
    </DetailRow>
  );
};
