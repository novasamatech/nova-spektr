import { BN } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { memo } from 'react';

import { type Asset } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { DetailRow, FootnoteText, IconButton } from '@/shared/ui';
import { Tooltip } from '@/shared/ui-kit';
import { AssetBalance } from '@/entities/asset';
import { FeeLoader } from '@/entities/transaction';
import { flexibleMultisigModel } from '../model/flexible-multisig-create';

type Props = {
  asset: Asset;
};

export const MultisigFees = memo(({ asset }: Props) => {
  const { t } = useI18n();

  const fee = useUnit(flexibleMultisigModel.$fee);
  const multisigDeposit = useUnit(flexibleMultisigModel.$multisigDeposit);
  const proxyDeposit = useUnit(flexibleMultisigModel.$proxyDeposit);
  const isLoading = useUnit(flexibleMultisigModel.$isLoading);

  const totalFee = multisigDeposit.add(fee).add(new BN(proxyDeposit));

  if (isLoading) {
    return (
      <div className="mr-4">
        <FeeLoader />
      </div>
    );
  }

  return (
    <DetailRow
      label={
        <>
          <FootnoteText className="text-text-tertiary">
            {t('createMultisigAccount.multisigCreationFeeLabel')}
          </FootnoteText>
          <Tooltip>
            <Tooltip.Trigger>
              <IconButton name="info" size={16} />
            </Tooltip.Trigger>
            <Tooltip.Content>
              <div className="text-text-tertiary">
                <div>
                  {t('createMultisigAccount.flexibleMultisig.proxyDeposit')}
                  <AssetBalance value={proxyDeposit} asset={asset} className="ml-1 text-text-tertiary" />
                </div>
                <div>
                  {t('createMultisigAccount.multisigDeposit')}
                  <AssetBalance value={multisigDeposit} asset={asset} className="ml-1 text-text-tertiary" />
                </div>
                <div>
                  {t('createMultisigAccount.networkFee')}
                  <AssetBalance value={fee} asset={asset} className="ml-1 text-text-tertiary" />
                </div>
              </div>
            </Tooltip.Content>
          </Tooltip>
        </>
      }
      className="text-text-primary"
      wrapperClassName="w-auto mx-4"
    >
      <div className="ml-4 flex flex-col items-end gap-y-0.5">
        <AssetBalance value={totalFee.toString()} asset={asset} className="" />
      </div>
    </DetailRow>
  );
});
