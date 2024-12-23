import { useUnit } from 'effector-react';
import { memo } from 'react';

import { type Asset } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { FootnoteText, IconButton } from '@/shared/ui';
import { Tooltip } from '@/shared/ui-kit';
import { AssetBalance } from '@/entities/asset';
import { priceProviderModel } from '@/entities/price';
import { FeeLoader } from '@/entities/transaction';
import { flexibleMultisigModel } from '../model/flexible-multisig-create';

type Props = {
  asset: Asset;
};

export const MultisigFees = memo(({ asset }: Props) => {
  const { t } = useI18n();

  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);
  const fee = useUnit(flexibleMultisigModel.$fee);
  const multisigDeposit = useUnit(flexibleMultisigModel.$multisigDeposit);
  const proxyDeposit = useUnit(flexibleMultisigModel.$proxyDeposit);
  const isLoading = useUnit(flexibleMultisigModel.$isLoading);

  const totalFee = multisigDeposit.add(fee).add(proxyDeposit);

  if (isLoading) {
    return <FeeLoader fiatFlag={Boolean(fiatFlag)} />;
  }

  return (
    <div className="flex items-center gap-x-4">
      <div className="flex items-center gap-x-1">
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
      </div>

      <AssetBalance value={totalFee.toString()} asset={asset} />
    </div>
  );
});
