import { type BN } from '@polkadot/util';
import { type ComponentProps } from 'react';

import { type Asset } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { DetailRow, FootnoteText, Icon } from '@/shared/ui';
import { Tooltip } from '@/shared/ui-kit';
import { Fee } from '../Fee/Fee';
import { MultisigDeposit } from '../MultisigDeposit/MultisigDeposit';

type Props = ComponentProps<typeof MultisigDeposit> & {
  wrapperClassName?: string;
};

/** @deprecated Use MultisigDepositFee with createMultisigDeposit instead */
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

type MultisigDepositProps = {
  asset: Asset;
  multisigDeposit: BN | string;
  isLoading?: boolean;
};

export const MultisigDepositFee = ({ asset, multisigDeposit, isLoading }: MultisigDepositProps) => {
  const { t } = useI18n();

  return (
    <DetailRow
      className="text-text-primary"
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
    >
      <Fee fee={multisigDeposit} asset={asset} isLoading={isLoading} />
    </DetailRow>
  );
};
