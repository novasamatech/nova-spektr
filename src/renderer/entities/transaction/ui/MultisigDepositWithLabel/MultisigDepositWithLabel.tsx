import { type ComponentProps } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { DetailRow, FootnoteText, Icon } from '@/shared/ui';
import { Tooltip } from '@/shared/ui-kit';
import { MultisigDeposit } from '../MultisigDeposit/MultisigDeposit';

type Props = ComponentProps<typeof MultisigDeposit> & {
  wrapperClassName?: string;
};

export const MultisigDepositWithLabel = ({ wrapperClassName, ...depositProps }: Props) => {
  const { t } = useI18n();

  return (
    <DetailRow
      label={
        <>
          <Icon className="text-text-tertiary" name="lock" size={12} />
          <FootnoteText className="text-text-tertiary">{t('staking.multisigDepositLabel')}</FootnoteText>
          <Tooltip>
            <Tooltip.Trigger>
              <div tabIndex={0}>
                <Icon name="info" className="cursor-pointer hover:text-icon-hover" size={16} />
              </div>
            </Tooltip.Trigger>
            <Tooltip.Content>{t('staking.tooltips.depositDescription')}</Tooltip.Content>
          </Tooltip>
        </>
      }
      className={cnTw('text-text-primary', wrapperClassName)}
    >
      <MultisigDeposit {...depositProps} />
    </DetailRow>
  );
};
