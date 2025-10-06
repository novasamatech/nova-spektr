import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { nonNullable } from '@/shared/lib/utils';
import { FootnoteText, IconButton } from '@/shared/ui';
import { AssetBalance } from '@/shared/ui-entities';
import { Tooltip } from '@/shared/ui-kit';
import { FeeLoader } from '@/entities/transaction';
import { changeSignatoriesModel } from '../../model/change-signatories-model';
import { formModel } from '../../model/form-model';

export const MultisigFees = () => {
  const { t } = useI18n();

  const isLoading = useUnit(changeSignatoriesModel.$isLoading);
  const fee = useUnit(changeSignatoriesModel.$fee);
  const proxyDeposit = useUnit(changeSignatoriesModel.$proxyDeposit);
  const multisigDeposit = useUnit(changeSignatoriesModel.$multisigDeposit);
  const totalDeposit = useUnit(changeSignatoriesModel.$totalDeposit);
  const asset = useUnit(formModel.$asset);

  if (!asset) return;

  if (isLoading) {
    return <FeeLoader fiatFlag={false} />;
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

      {nonNullable(totalDeposit) && <AssetBalance value={totalDeposit} asset={asset} />}
    </div>
  );
};
