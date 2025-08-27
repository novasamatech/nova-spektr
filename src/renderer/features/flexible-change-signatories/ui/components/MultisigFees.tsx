import { BN } from '@polkadot/util';
import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { FootnoteText, IconButton } from '@/shared/ui';
import { AssetBalance } from '@/shared/ui-entities';
import { Tooltip } from '@/shared/ui-kit';
import { priceProviderModel } from '@/entities/price';
import { FeeLoader } from '@/entities/transaction';
import { changeSignatoriesModel } from '../../model/change-signatories-model';
import { formModel } from '../../model/form-model';

export const MultisigFees = () => {
  const { t } = useI18n();

  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);
  const fee = useUnit(changeSignatoriesModel.$fee);
  const isLoading = useUnit(changeSignatoriesModel.$isLoading);
  const proxyDeposit = useUnit(formModel.$proxyDeposit);
  const multisigDeposit = useUnit(formModel.$multisigDeposit);
  const asset = useUnit(formModel.$asset);

  const totalFee = fee.add(multisigDeposit).add(new BN(proxyDeposit ?? 0));

  if (!asset) return;

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
            <div className="gap-2 text-help-text text-white">
              <div>
                {t('createMultisigAccount.flexibleMultisig.proxyDeposit')}
                <AssetBalance value={proxyDeposit ?? '0'} asset={asset} className="ml-1 text-help-text text-inherit" />
              </div>
              <div>
                {t('createMultisigAccount.multisigDeposit')}
                <AssetBalance value={multisigDeposit} asset={asset} className="ml-1 text-help-text text-inherit" />
              </div>
              <div>
                {t('createMultisigAccount.networkFee')}
                <AssetBalance value={fee} asset={asset} className="ml-1 text-help-text text-inherit" />
              </div>
            </div>
          </Tooltip.Content>
        </Tooltip>
      </div>

      <AssetBalance value={totalFee.toString()} asset={asset} />
    </div>
  );
};
