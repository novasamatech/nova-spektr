import { ComponentProps } from 'react';

import { useI18n } from '@app/providers';
import { Icon, FootnoteText, Tooltip, DetailRow } from '@shared/ui';
import { MultisigDeposit } from '../MultisigDeposit/MultisigDeposit';
import { cnTw } from '@shared/lib/utils';

type Props = {
  wrapperClassName?: string;
} & ComponentProps<typeof MultisigDeposit>;

export const MultisigDepositWithLabel = ({ wrapperClassName, ...depositProps }: Props) => {
  const { t } = useI18n();

  return (
    <DetailRow
      label={
        <>
          <Icon className="text-text-tertiary" name="lock" size={12} />
          <FootnoteText className="text-text-tertiary">{t('staking.networkDepositLabel')}</FootnoteText>
          <Tooltip content={t('staking.tooltips.depositDescription')} offsetPx={-90}>
            <Icon name="info" className="hover:text-icon-hover cursor-pointer" size={16} />
          </Tooltip>
        </>
      }
      className={cnTw('text-text-primary', wrapperClassName)}
    >
      <MultisigDeposit {...depositProps} />
    </DetailRow>
  );
};
