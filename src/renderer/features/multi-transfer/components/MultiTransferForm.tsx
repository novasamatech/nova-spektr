import { useUnit } from 'effector-react';
import { type FormEvent, memo } from 'react';

import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { Button, DetailRow } from '@/shared/ui';
import { AssetBalance, TransactionValidationError } from '@/shared/ui-entities';
import { Box, Modal, ScrollArea } from '@/shared/ui-kit';
import { AssetFiatBalance } from '@/entities/price';
import { FeeWithLabel, MultisigDepositFee } from '@/entities/transaction';
import { walletModel } from '@/entities/wallet';
import { formModel } from '../model/form';

import { UploadCSV } from './MultiTransferUpload';
import { NetworkSelect } from './NetworkSelect';

type Props = {
  formId: string;
};

export const MultiTransferForm = ({ formId }: Props) => {
  const { t } = useI18n();
  const { submit } = useForm(formModel.form);

  const canSubmit = useUnit(formModel.$canSubmit);
  const wallets = useUnit(walletModel.$wallets);
  const txErrors = useUnit(formModel.$txErrors);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <>
      <ScrollArea>
        <form id={formId} onSubmit={handleSubmit}>
          <Box padding={[4, 5]} gap={4}>
            <TransactionValidationError errors={txErrors} wallets={wallets} />
            <NetworkSelect />
            <UploadCSV />
            <TotalAmountSection />
            <FeeSection />
          </Box>
        </form>
      </ScrollArea>

      <Modal.Footer>
        <Button form={formId} type="submit" disabled={!canSubmit}>
          {t('transfer.continueButton')}
        </Button>
      </Modal.Footer>
    </>
  );
};

const TotalAmountSection = memo(() => {
  const { t } = useI18n();

  const amount = useUnit(formModel.$amount);
  const asset = useUnit(formModel.$asset);

  if (nullable(amount) || nullable(asset)) return null;

  return (
    <DetailRow label={t('multiTransfer.form.fields.amount.label', 'Total amount')}>
      <div className="flex flex-col items-end gap-y-0.5">
        <AssetBalance value={amount} asset={asset} showSymbol />
        <AssetFiatBalance asset={asset} amount={amount} />
      </div>
    </DetailRow>
  );
});

const FeeSection = memo(() => {
  const fee = useUnit(formModel.$fee);
  const pendingFee = useUnit(formModel.$pendingFee);
  const multisigDeposit = useUnit(formModel.$multisigDeposit);
  const hasMultisigAccount = useUnit(formModel.$hasMultisigAccount);
  const asset = useUnit(formModel.$asset);

  if (nullable(asset)) return null;

  return (
    <>
      {hasMultisigAccount && <MultisigDepositFee asset={asset} multisigDeposit={multisigDeposit} />}
      <FeeWithLabel asset={asset} fee={fee} isLoading={pendingFee} />
    </>
  );
});
