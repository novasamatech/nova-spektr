import { useUnit } from 'effector-react';
import { type FormEvent } from 'react';

import { type MultisigAccount } from '@/shared/core';
import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { Button, InputHint } from '@/shared/ui';
import { TransactionValidationError } from '@/shared/ui-entities';
import { walletModel } from '@/entities/wallet';
import { AmountInput } from '@/features/assets-balances';
import { DraftFormBody, DraftModeCard, DraftSigningPath } from '@/features/drafts';
import { SigningPathSection } from '@/features/signing-path';
import { FeeWithLabel, MultisigDepositWithLabel } from '@/widgets/transaction-fee';
import { formModel } from '../model/form-model';

type Props = {
  onGoBack: () => void;
};

export const RestakeForm = ({ onGoBack }: Props) => {
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
    <div className="flex flex-col gap-4 px-5 pb-4">
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
            <Amount />
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
      onChange={formModel.events.signingPathChanged}
    />
  );
};

const Amount = () => {
  const { t } = useI18n();

  const {
    fields: { amount },
  } = useForm(formModel.form);

  const restakeBalanceRange = useUnit(formModel.$restakeBalanceRange);
  const isStakingLoading = useUnit(formModel.$isStakingLoading);
  const network = useUnit(formModel.$networkStore);

  if (!network) {
    return null;
  }

  return (
    <div className="flex flex-col gap-y-2">
      <AmountInput
        invalid={amount.hasError}
        value={amount.value}
        balance={isStakingLoading ? null : restakeBalanceRange}
        balancePlaceholder={t('general.input.availableLabel')}
        placeholder={t('general.input.amountLabel')}
        asset={network.asset}
        onChange={amount.onChange}
      />
      <InputHint active={amount.hasError} variant="error">
        {t(amount.errorMessage)}
      </InputHint>
    </div>
  );
};

const FeeSection = () => {
  const { t } = useI18n();

  const {
    fields: { initiator },
  } = useForm(formModel.form);

  const api = useUnit(formModel.$api);
  const network = useUnit(formModel.$networkStore);
  const isMultisig = useUnit(formModel.$isMultisig);
  const fee = useUnit(formModel.$fee);
  const pendingFee = useUnit(formModel.$pendingFee);

  if (!network || !initiator) {
    return null;
  }

  return (
    <div className="flex flex-col gap-y-2">
      {isMultisig && (
        <MultisigDepositWithLabel
          api={api}
          asset={network.asset}
          threshold={(initiator.value as MultisigAccount).threshold || 1}
          onDepositChange={formModel.events.multisigDepositChanged}
        />
      )}

      <FeeWithLabel
        label={t('staking.networkFee', { count: 1 })}
        asset={network.asset}
        fee={fee}
        isLoading={pendingFee}
      />
    </div>
  );
};

const ActionsSection = ({ onGoBack }: Props) => {
  const { t } = useI18n();

  const canSubmit = useUnit(formModel.$canSubmit);
  const canSaveAsDraft = useUnit(formModel.$canSaveAsDraft);
  const isDraftMode = useUnit(formModel.$isDraftMode);

  return (
    <div className="mt-4 flex items-center justify-between">
      <Button variant="text" onClick={onGoBack}>
        {t('operation.goBackButton')}
      </Button>
      <Button
        form={isDraftMode ? undefined : 'transfer-form'}
        type={isDraftMode ? 'button' : 'submit'}
        disabled={isDraftMode ? !canSaveAsDraft : !canSubmit}
        onClick={isDraftMode ? () => formModel.events.saveAsDraftRequested() : undefined}
      >
        {isDraftMode ? t('operations.drafts.initiateButton') : t('transfer.continueButton')}
      </Button>
    </div>
  );
};
