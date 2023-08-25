import { ComponentProps } from 'react';

import { useI18n } from '@renderer/app/providers';
import { Icon, FootnoteText, Tooltip, DetailRow } from '@renderer/shared/ui';
import { Deposit } from '../Deposit/Deposit';

export const DepositWithLabel = ({ ...depositProps }: ComponentProps<typeof Deposit>) => {
  const { t } = useI18n();

  return (
    <DetailRow
      label={
        <>
          <Icon className="text-text-tertiary" name="lock" size={16} />
          <FootnoteText className="text-text-tertiary">{t('staking.networkDepositLabel')}</FootnoteText>
          <Tooltip content={t('staking.tooltips.depositDescription')} offsetPx={-90} pointerDirection="down">
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
