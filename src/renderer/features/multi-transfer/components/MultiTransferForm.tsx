import { useUnit } from 'effector-react';
import { type FormEvent, memo } from 'react';

import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { Button, DetailRow } from '@/shared/ui';
import { AssetBalance, TransactionValidationError } from '@/shared/ui-entities';
import { Box, Modal, ScrollArea } from '@/shared/ui-kit';
import { walletModel } from '@/entities/wallet';
import { DraftModeCard, DraftSigningPath } from '@/features/drafts';
import { SigningPathSection } from '@/features/signing-path';
import { AssetFiatBalance } from '@/widgets/price';
import { FeeWithLabel, MultisigDepositFee } from '@/widgets/transaction-fee';
import { formModel } from '../model/form';

import { UploadCSV } from './MultiTransferUpload';
import { NetworkSelect } from './NetworkSelect';

type Props = {
  formId: string;
};

export const MultiTransferForm = memo(({ formId }: Props) => {
  const { t } = useI18n();
  const { submit } = useForm(formModel.form);

  const canSubmit = useUnit(formModel.$canSubmit);
  const canSaveAsDraft = useUnit(formModel.$canSaveAsDraft);
  const isDraftMode = useUnit(formModel.$isDraftMode);
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
            <DraftModeCard isOn={isDraftMode} onToggle={formModel.events.toggleDraftMode} />
            {/* In draft mode the eventual signer pays the fee and is responsible
                for signer-validity, so we hide tx-level validation and the fee
                section — the form stays focused on call-data inputs. */}
            {!isDraftMode && <TransactionValidationError errors={txErrors} wallets={wallets} />}
            <NetworkSelect />
            <Signatories />
            <UploadCSV />
            <TotalAmountSection />
            {!isDraftMode && <FeeSection />}
          </Box>
        </form>
      </ScrollArea>

      <Modal.Footer>
        <div className="flex items-center gap-3">
          <Button
            form={isDraftMode ? undefined : formId}
            type={isDraftMode ? 'button' : 'submit'}
            disabled={isDraftMode ? !canSaveAsDraft : !canSubmit}
            onClick={isDraftMode ? () => formModel.events.saveAsDraftRequested() : undefined}
          >
            {isDraftMode ? t('operations.drafts.initiateButton') : t('transfer.continueButton')}
          </Button>
        </div>
      </Modal.Footer>
    </>
  );
});

const Signatories = () => {
  const { t } = useI18n();
  const {
    fields: { signatory },
  } = useForm(formModel.form);

  const isDraftMode = useUnit(formModel.$isDraftMode);
  const signingPath = useUnit(formModel.$signingPath);
  const chain = useUnit(formModel.$chain);
  const asset = useUnit(formModel.$asset);
  const txErrors = useUnit(formModel.$txErrors);

  if (isDraftMode) {
    return (
      <DraftSigningPath
        chainId={chain?.chainId ?? null}
        asset={asset}
        $draftPath={formModel.$draftSigningPath}
        draftPathCommitted={formModel.events.draftPathCommitted}
        draftPathEditStarted={formModel.events.draftPathEditStarted}
        draftPathEditEnded={formModel.events.draftPathEditEnded}
      />
    );
  }

  return (
    <SigningPathSection
      signingPath={signingPath}
      chain={chain}
      asset={asset}
      txErrors={txErrors}
      errorText={t(signatory.errorMessage)}
      onChange={formModel.signingPathChanged}
    />
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
