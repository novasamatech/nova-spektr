import { useUnit } from 'effector-react';
import { type FormEvent } from 'react';

import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { Button, DetailRow, FootnoteText, Icon, InputHint } from '@/shared/ui';
import { TransactionValidationError } from '@/shared/ui-entities';
import { Tooltip } from '@/shared/ui-kit';
import { walletModel } from '@/entities/wallet';
import { DraftFormBody, DraftModeCard, DraftSigningPath } from '@/features/drafts';
import { SigningPathSection } from '@/features/signing-path';
import { Fee, FeeWithLabel } from '@/widgets/transaction-fee';
import { formModel } from '../model/form-model';

type Props = {
  onGoBack: () => void;
};

export const NominateForm = ({ onGoBack }: Props) => {
  const { submit } = useForm(formModel.form);
  const errors = useUnit(formModel.$errors);
  const wallets = useUnit(walletModel.$wallets);
  const isDraftMode = useUnit(formModel.$isDraftMode);
  const network = useUnit(formModel.$networkStore);

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <div className="flex w-modal flex-col gap-4 px-5 pb-4">
      <DraftModeCard isOn={isDraftMode} onToggle={formModel.events.toggleDraftMode} />
      {isDraftMode && network && (
        <DraftSigningPath
          chainId={network.chain.chainId}
          asset={network.asset}
          $draftPath={formModel.$draftSigningPath}
          draftPathCommitted={formModel.events.draftPathCommitted}
          draftPathEditStarted={formModel.events.draftPathEditStarted}
          draftPathEditEnded={formModel.events.draftPathEditEnded}
        />
      )}
      <DraftFormBody $isDraftMode={formModel.$isDraftMode} $isDraftPathComplete={formModel.$isDraftPathComplete}>
        <div className="flex flex-col gap-4">
          {!isDraftMode && <TransactionValidationError errors={errors} wallets={wallets} />}
          <form id="transfer-form" className="flex flex-col gap-y-4" onSubmit={submitForm}>
            <Signatories />
          </form>
          {!isDraftMode && (
            <div className="flex flex-col gap-y-6 pt-2 pb-4">
              <FeeSection />
            </div>
          )}
        </div>
      </DraftFormBody>
      <ActionsSection onGoBack={onGoBack} />
    </div>
  );
};

const Signatories = () => {
  const { t } = useI18n();

  const {
    fields: { signatory },
  } = useForm(formModel.form);

  const isDraftMode = useUnit(formModel.$isDraftMode);
  const signingPath = useUnit(formModel.$signingPath);
  const network = useUnit(formModel.$networkStore);
  const formErrors = useUnit(formModel.$errors);

  if (isDraftMode) return null;

  return (
    <SigningPathSection
      signingPath={signingPath}
      chain={network?.chain ?? null}
      asset={network?.asset ?? null}
      txErrors={formErrors}
      errorText={t(signatory.errorMessage)}
      onChange={formModel.signingPathChanged}
    />
  );
};

const FeeSection = () => {
  const { t } = useI18n();

  const {
    fields: { initiator, amount },
  } = useForm(formModel.form);

  const network = useUnit(formModel.$networkStore);
  const fee = useUnit(formModel.$fee);
  const pendingFee = useUnit(formModel.$pendingFee);
  const isMultisig = useUnit(formModel.$isMultisig);
  const multisigDeposit = useUnit(formModel.$multisigDeposit);

  if (!network || !initiator.value) {
    return null;
  }

  return (
    <div className="flex flex-col gap-y-2">
      {isMultisig && (
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
          <Fee fee={multisigDeposit.toString()} asset={network.chain.assets[0]!} />
        </DetailRow>
      )}

      <FeeWithLabel
        fee={fee}
        isLoading={pendingFee}
        asset={network.chain.assets[0]!}
        label={t('staking.networkFee', { count: 1 })}
      />
      <InputHint active={amount.hasError} variant="error">
        {t(amount.errorMessage)}
      </InputHint>
    </div>
  );
};

const ActionsSection = ({ onGoBack }: Props) => {
  const { t } = useI18n();

  const canSubmit = useUnit(formModel.$canSubmit);

  return (
    <div className="mt-4 flex items-center justify-between">
      <Button variant="text" onClick={onGoBack}>
        {t('operation.goBackButton')}
      </Button>
      <Button form="transfer-form" type="submit" disabled={!canSubmit}>
        {t('transfer.continueButton')}
      </Button>
    </div>
  );
};
