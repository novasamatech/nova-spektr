import { ComponentProps } from 'react';

import { useI18n } from '@app/providers';
import { Icon, FootnoteText, Tooltip, DetailRow } from '@shared/ui';
import { Deposit } from '../Deposit/Deposit';
import { cnTw } from '@shared/lib/utils';

type Props = {
  wrapperClassName?: string;
} & ComponentProps<typeof Deposit>;

export const DepositWithLabel = ({ wrapperClassName, ...depositProps }: Props) => {
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
      className={cnTw('text-text-primary', wrapperClassName)}
    >
      <Deposit {...depositProps} />
    </DetailRow>
  );
};
