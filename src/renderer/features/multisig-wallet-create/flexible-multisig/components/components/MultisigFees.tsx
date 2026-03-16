import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { FootnoteText, IconButton } from '@/shared/ui';
import { AssetBalance } from '@/shared/ui-entities';
import { Tooltip } from '@/shared/ui-kit';
import { priceProviderModel } from '@/domains/price';
import { FeeLoader } from '@/entities/transaction';
import { flexibleMultisigModel } from '../../model/flexible-multisig-create';

export const MultisigFees = () => {
  const { t } = useI18n();

  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);
  const fee = useUnit(flexibleMultisigModel.$fee);
  const proxyDeposit = useUnit(flexibleMultisigModel.$proxyDeposit);
  const existentialDeposit = useUnit(flexibleMultisigModel.$existentialDeposit);
  const totalDeposit = useUnit(flexibleMultisigModel.$totalDeposit);
  const isLoading = useUnit(flexibleMultisigModel.$isLoading);
  const asset = useUnit(flexibleMultisigModel.$asset);

  const totalFee = fee?.add(totalDeposit);

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
                {t('createMultisigAccount.flexibleMultisig.existentialDeposit')}
                <AssetBalance value={existentialDeposit} asset={asset} className="ml-1 text-help-text text-inherit" />
              </div>
              <div>
                {t('createMultisigAccount.networkFee')}
                <AssetBalance value={fee ?? undefined} asset={asset} className="ml-1 text-help-text text-inherit" />
              </div>
            </div>
          </Tooltip.Content>
        </Tooltip>
      </div>

      <AssetBalance value={totalFee ?? undefined} asset={asset} />
    </div>
  );
};
