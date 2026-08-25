import { BN } from '@polkadot/util';
import { useGate, useStoreMap, useUnit } from 'effector-react';
import { type FormEvent } from 'react';

import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { formatAmount, formatAsset, fromPrecision } from '@/shared/lib/utils';
import { Button, DetailRow, FootnoteText, Icon, InputHint, SmallTitleText } from '@/shared/ui';
import { AssetBalance } from '@/shared/ui-entities';
import { Modal, Tooltip } from '@/shared/ui-kit';
import { OperationTitle } from '@/entities/chain';
import { BalanceDiff, LockPeriodDiff, LockValueDiff } from '@/entities/governance';
import { AmountInput } from '@/features/assets-balances';
import { DraftFormBody, DraftModeCard, DraftSigningPath } from '@/features/drafts';
import { lockPeriodsModel, locksPeriodsAggregate } from '@/features/governance';
import { SigningPathSection } from '@/features/signing-path';
import { ConvictionSelect } from '@/widgets/VoteModal';
import { AssetFiatBalance } from '@/widgets/price';
import { FeeWithLabel } from '@/widgets/transaction-fee';
import { formModel } from '../model/form-model';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onGoBack: () => void;
};

export const DelegateForm = ({ isOpen, onClose, onGoBack }: Props) => {
  const { t } = useI18n();
  const { submit } = useForm(formModel.form);
  const network = useUnit(formModel.$networkStore);
  const isDraftMode = useUnit(formModel.$isDraftMode);

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <Modal isOpen={isOpen} size="mdlg" height="lg" onToggle={onClose}>
      <Modal.Title close>
        {network?.chain && (
          <OperationTitle title={t('operations.modalTitles.editDelegationOn')} chainId={network.chain.chainId} />
        )}
      </Modal.Title>
      <Modal.Content>
        <div className="flex w-full flex-1 flex-col rounded-lg bg-card-background px-5">
          <DraftModeCard isOn={isDraftMode} onToggle={formModel.events.toggleDraftMode} />
          {isDraftMode && network && (
            <div className="mt-4">
              <DraftSigningPath
                chainId={network.chain.chainId}
                asset={network.asset}
                pinnedSourceAccountId={null}
                $draftPath={formModel.$draftSigningPath}
                draftPathCommitted={formModel.events.draftPathCommitted}
                draftPathEditStarted={formModel.events.draftPathEditStarted}
                draftPathEditEnded={formModel.events.draftPathEditEnded}
              />
            </div>
          )}
          <DraftFormBody $isDraftMode={formModel.$isDraftMode} $isDraftPathComplete={formModel.$isDraftPathComplete}>
            <div className="flex flex-1 flex-col">
              <SmallTitleText className="mt-4">{t('governance.addDelegation.formTitle')}</SmallTitleText>

              <form id="transfer-form" className="mt-4 flex flex-col gap-y-4" onSubmit={submitForm}>
                <Signatories />
                <Amount />
                <Conviction />
              </form>

              {!isDraftMode && (
                <div className="flex flex-1 flex-col justify-end gap-y-6 pt-6">
                  <FeeSection />
                </div>
              )}
            </div>
          </DraftFormBody>
        </div>
      </Modal.Content>
      <Modal.Footer>
        <ActionsSection onGoBack={onGoBack} />
      </Modal.Footer>
    </Modal>
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

  if (isDraftMode) return null;

  return (
    <SigningPathSection
      signingPath={signingPath}
      chain={network?.chain ?? null}
      asset={network?.asset ?? null}
      txErrors={[]}
      errorText={t(signatory.errorMessage)}
      onChange={formModel.events.signingPathChanged}
    />
  );
};

const Conviction = () => {
  const {
    fields: { conviction, isUnchanged },
  } = useForm(formModel.form);
  const network = useUnit(formModel.$networkStore);

  if (!network) {
    return null;
  }

  return <ConvictionSelect conviction={conviction.value} disabled={isUnchanged.value} onChange={conviction.onChange} />;
};

const Amount = () => {
  const { t } = useI18n();

  const {
    fields: { amount, isUnchanged },
  } = useForm(formModel.form);

  const network = useUnit(formModel.$networkStore);
  const delegateBalanceRange = useUnit(formModel.$delegateBalanceRange);
  const availableBalance = useUnit(formModel.$availableBalance);

  if (!network) {
    return null;
  }

  const showReuseLockBtn = availableBalance?.lock.gtn(0) && !isUnchanged.value;

  return (
    <div className="flex flex-col gap-y-2">
      <AmountInput
        invalid={amount.hasError}
        value={amount.value}
        disabled={isUnchanged.value}
        balance={delegateBalanceRange}
        balancePlaceholder={t('general.input.availableLabel')}
        placeholder={t('general.input.amountLabel')}
        asset={network.asset}
        onChange={amount.onChange}
      />
      {showReuseLockBtn && availableBalance && (
        <div className="flex justify-end">
          <Button
            size="sm"
            pallet="secondary"
            onClick={() => amount.onChange(fromPrecision(availableBalance.lock, network.asset.precision))}
          >
            {t('governance.vote.reuseLock')}: {formatAsset(availableBalance.lock, network.asset)}
          </Button>
        </div>
      )}
      <InputHint active={amount.hasError} variant="error">
        {t(amount.errorMessage)}
      </InputHint>
    </div>
  );
};

const FeeSection = () => {
  const { t } = useI18n();

  const {
    fields: { initiator, amount, conviction },
  } = useForm(formModel.form);

  const network = useUnit(formModel.$networkStore);
  const fee = useUnit(formModel.$fee);
  const pendingFee = useUnit(formModel.$pendingFee);
  const multisigDeposit = useUnit(formModel.$multisigDeposit);
  const isMultisig = useUnit(formModel.$hasAnyMultisig);
  const availableBalance = useUnit(formModel.$availableBalance);
  const previousConviction = useUnit(formModel.$previousConviction);

  const lockPeriods = useStoreMap({
    store: lockPeriodsModel.$lockPeriods,
    keys: [network?.chain],
    fn: (locks, [chain]) => (chain ? (locks[chain.chainId] ?? null) : null),
  });

  useGate(locksPeriodsAggregate.gates.flow, { chain: network?.chain });

  if (!network || !initiator.value || !availableBalance) {
    return null;
  }

  const amountValue = new BN(formatAmount(amount.value, network.asset.precision));

  return (
    <div className="flex flex-col gap-y-2">
      <DetailRow label={t('governance.operations.transferable')} wrapperClassName="items-start">
        <BalanceDiff
          from={availableBalance.balance}
          to={new BN(availableBalance.balance).sub(amountValue)}
          asset={network.asset}
          lock={availableBalance.lock}
        />
      </DetailRow>

      <DetailRow label={t('governance.locks.governanceLock')} wrapperClassName="items-start">
        <LockValueDiff asset={network.asset} from={availableBalance.lock} to={amountValue} />
      </DetailRow>

      <DetailRow label={t('governance.locks.undelegatePeriod')} wrapperClassName="items-start">
        <LockPeriodDiff from={previousConviction} to={conviction.value} lockPeriods={lockPeriods} />
      </DetailRow>

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
          <div className="flex flex-col items-end gap-y-0.5">
            <AssetBalance value={multisigDeposit.toString()} asset={network.chain.assets[0]!} />
            <AssetFiatBalance asset={network.chain.assets[0]!} amount={multisigDeposit.toString()} />
          </div>
        </DetailRow>
      )}

      <FeeWithLabel
        fee={fee}
        isLoading={pendingFee}
        asset={network.chain.assets[0]!}
        label={t('staking.networkFee', { count: 1 })}
      />
    </div>
  );
};

const ActionsSection = ({ onGoBack }: { onGoBack: () => void }) => {
  const { t } = useI18n();

  const canSubmit = useUnit(formModel.$canSubmit);
  const canSaveAsDraft = useUnit(formModel.$canSaveAsDraft);
  const isDraftMode = useUnit(formModel.$isDraftMode);

  return (
    <div className="flex w-full items-center justify-between">
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
