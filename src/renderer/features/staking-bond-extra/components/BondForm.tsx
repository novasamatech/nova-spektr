import { useUnit } from 'effector-react';
import { type FormEvent, useMemo } from 'react';

import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { formatAsset, transferableAmount } from '@/shared/lib/utils';
import { Button, DetailRow, FootnoteText, Icon, InputHint } from '@/shared/ui';
import { SignatorySelect, TransactionValidationError } from '@/shared/ui-entities';
import { Tooltip } from '@/shared/ui-kit';
import { accounts } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { transactionService } from '@/entities/transaction';
import { walletModel } from '@/entities/wallet';
import { AmountInput } from '@/features/assets-balances';
import { InitiateDraftButton } from '@/features/drafts';
import { SigningPathControl } from '@/features/signing-path';
import { Fee, FeeWithLabel } from '@/widgets/transaction-fee';
import { formModel } from '../model/form-model';

type Props = {
  onGoBack: () => void;
};

export const BondForm = ({ onGoBack }: Props) => {
  const { submit } = useForm(formModel.form);
  const errors = useUnit(formModel.$errors);
  const wallets = useUnit(walletModel.$wallets);

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <div className="px-5 pb-4">
      <TransactionValidationError errors={errors} wallets={wallets} />
      <form id="transfer-form" className="mt-4 flex flex-col gap-y-4" onSubmit={submitForm}>
        <Signatories />
        <Amount />
      </form>
      <div className="flex flex-col gap-y-6 pt-6 pb-4">
        <FeeSection />
      </div>
      <ActionsSection onGoBack={onGoBack} />
    </div>
  );
};

const Signatories = () => {
  const { t } = useI18n();

  const {
    fields: { signatory, initiator },
  } = useForm(formModel.form);

  const signatories = useUnit(formModel.$signatories);
  const signingPath = useUnit(formModel.$signingPath);
  const network = useUnit(formModel.$networkStore);
  const balances = useUnit(balanceModel.$balanceMap);
  const allAccounts = useUnit(accounts.$list);
  const allWallets = useUnit(walletModel.$wallets);

  const signatoriesWithBalance = useMemo(() => {
    if (!network) {
      return [];
    }

    return signatories.map((signatory) => {
      const balance = balanceUtils.getBalance(
        balances,
        signatory.accountId,
        network.chain.chainId,
        network.asset.assetId,
      );
      return { account: signatory, balance: transferableAmount(balance) };
    });
  }, [signatories, balances]);

  if (!network) {
    return null;
  }

  const pathChip = (
    <SigningPathControl chainId={network.chain.chainId} path={signingPath} onChange={formModel.signingPathChanged} />
  );

  return (
    <SignatorySelect
      signatory={signatory.value}
      signatories={signatoriesWithBalance}
      hasError={signatory.hasError}
      errorText={t(signatory.errorMessage)}
      network={network}
      allAccounts={allAccounts}
      initiator={initiator.value}
      allWallets={allWallets}
      action={pathChip}
      onChange={signatory.onChange}
    />
  );
};

const Amount = () => {
  const { t } = useI18n();

  const {
    fields: { amount },
  } = useForm(formModel.form);

  const network = useUnit(formModel.$networkStore);
  const bondBalanceRange = useUnit(formModel.$bondBalanceRange);
  const reusableLock = useUnit(formModel.$reusableLock);
  const setReuseLockMode = useUnit(formModel.setReuseLockMode);

  if (!network) {
    return null;
  }

  const showReuseLockBtn = !!reusableLock?.gtn(0);

  return (
    <div className="flex flex-col gap-y-2">
      <AmountInput
        invalid={amount.hasError}
        value={amount.value}
        balance={bondBalanceRange}
        balancePlaceholder={t('general.input.availableLabel')}
        placeholder={t('general.input.amountLabel')}
        asset={network.asset}
        onChange={amount.onChange}
        onKeyDown={() => setReuseLockMode(false)}
      />
      <InputHint active={amount.hasError} variant="error">
        {t(amount.errorMessage)}
      </InputHint>

      {reusableLock && showReuseLockBtn && (
        <div className="flex justify-end">
          <Button size="sm" pallet="secondary" onClick={() => setReuseLockMode(true)}>
            {t('governance.vote.reuseLock')}: {formatAsset(reusableLock, network.asset)}
          </Button>
        </div>
      )}
    </div>
  );
};

const FeeSection = () => {
  const { t } = useI18n();

  const {
    fields: { initiator },
  } = useForm(formModel.form);

  const network = useUnit(formModel.$networkStore);
  const fee = useUnit(formModel.$fee);
  const multisigDeposit = useUnit(formModel.$multisigDeposit);
  const isFeeLoading = useUnit(formModel.$pendingFee);
  const isMultisig = useUnit(formModel.$isMultisig);

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
          <Fee fee={multisigDeposit.toString()} asset={network.asset} />
        </DetailRow>
      )}

      <FeeWithLabel fee={fee} isLoading={isFeeLoading} asset={network.asset} />
    </div>
  );
};

const ActionsSection = ({ onGoBack }: Props) => {
  const { t } = useI18n();

  const canSubmit = useUnit(formModel.$canSubmit);
  const coreTx = useUnit(formModel.$coreTx);
  const api = useUnit(formModel.$api);
  const network = useUnit(formModel.$networkStore);
  const draftCallData = transactionService.getCallDataHex(coreTx, api);

  return (
    <div className="mt-4 flex items-center justify-between">
      <Button variant="text" onClick={onGoBack}>
        {t('operation.goBackButton')}
      </Button>
      <div className="flex items-center gap-3">
        <InitiateDraftButton
          callData={draftCallData}
          chainId={network?.chain.chainId}
          source="staking-bond-extra"
          onDraftCreated={onGoBack}
        />
        <Button form="transfer-form" type="submit" disabled={!canSubmit}>
          {t('transfer.continueButton')}
        </Button>
      </div>
    </div>
  );
};
