import { useUnit } from 'effector-react';
import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { FootnoteText, Icon } from '@/shared/ui';
import { Fee } from '@/entities/transaction';
import { flowModel } from '../../model/flow-model';
import { formModel } from '../../model/form-model';

export const MultisigCreationFees = memo(() => {
  const { t } = useI18n();

  const fee = useUnit(flowModel.$fee);
  const signer = useUnit(flowModel.$signer);
  const multisigDeposit = useUnit(flowModel.$multisigDeposit);
  const isMultisigDepositLoading = useUnit(flowModel.$isMultisigDepositLoading);
  const isFeeLoading = useUnit(flowModel.$isFeeLoading);
  const chain = useUnit(formModel.$chain);

  const asset = chain?.assets.at(0);

  if (!asset || !signer) return;

  const totalFee = multisigDeposit.add(fee).toString();
  const isLoading = isFeeLoading || isMultisigDepositLoading;

  return (
    <div className="flex items-center gap-x-2">
      <FootnoteText className="text-text-tertiary">{t('createMultisigAccount.networkFee')}</FootnoteText>
      <Fee fee={totalFee} isLoading={isLoading} asset={asset} />

      <Icon size={16} name="edit" className="text-icon-default" />
    </div>
  );
});
