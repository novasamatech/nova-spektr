import { useUnit } from 'effector-react';
import { type FormEvent } from 'react';

import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { formatBalance } from '@/shared/lib/utils';
import { Button, DetailRow, FootnoteText, Icon, InputHint } from '@/shared/ui';
import { Tooltip } from '@/shared/ui-kit';
import { SignatorySelector } from '@/entities/operations';
import { Fee, FeeWithLabel } from '@/entities/transaction';
import { ProxyWalletAlert, accountUtils } from '@/entities/wallet';
import { AmountInput } from '@/features/assets-balances';
import { formModel } from '../model/form-model';

type Props = {
  onGoBack: () => void;
};

export const UnstakeForm = ({ onGoBack }: Props) => {
  const { submit } = useForm(formModel.form);

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <div className="px-5 pb-4">
      <form id="transfer-form" className="mt-4 flex flex-col gap-y-4" onSubmit={submitForm}>
        <ProxyFeeAlert />
        <Signatories />
        <Amount />
      </form>
      <div className="flex flex-col gap-y-6 pb-4 pt-6">
        <FeeSection />
      </div>
      <ActionsSection onGoBack={onGoBack} />
    </div>
  );
};

const ProxyFeeAlert = () => {
  const {
    fields: { initiator },
  } = useForm(formModel.form);

  const fee = useUnit(formModel.$fee);
  const proxyBalance = useUnit(formModel.$proxyBalance);
  const network = useUnit(formModel.$networkStore);
  const proxyWallet = useUnit(formModel.$proxyWallet);
  const isProxy = useUnit(formModel.$isProxy);

  if (!proxyWallet || !network || !isProxy || !initiator.hasError) {
    return null;
  }

  const formattedFee = formatBalance(fee, network.asset.precision).value;
  const formattedBalance = formatBalance(proxyBalance, network.asset.precision).value;

  return (
    <ProxyWalletAlert
      wallet={proxyWallet}
      fee={formattedFee}
      balance={formattedBalance}
      symbol={network.asset.symbol}
      onClose={() => {}}
    />
  );
};

const Signatories = () => {
  const { t } = useI18n();

  const {
    fields: { signatory },
  } = useForm(formModel.form);

  const signatories = useUnit(formModel.$signatories);
  const network = useUnit(formModel.$networkStore);

  if (!network || signatories.length < 2) {
    return null;
  }

  return (
    <SignatorySelector
      signatory={signatory.value}
      signatories={signatories}
      asset={network.chain.assets?.[0]}
      addressPrefix={network.chain.addressPrefix}
      hasError={signatory.hasError}
      errorText={t(signatory.errorMessage)}
      onChange={signatory.onChange}
    />
  );
};

const Amount = () => {
  const { t } = useI18n();

  const {
    fields: { amount },
  } = useForm(formModel.form);

  const unstakeBalanceRange = useUnit(formModel.$unstakeBalanceRange);
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
        balance={isStakingLoading ? null : unstakeBalanceRange}
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

  const network = useUnit(formModel.$networkStore);
  const fee = useUnit(formModel.$fee);
  const pendingFee = useUnit(formModel.$pendingFee);
  const route = useUnit(formModel.$route);
  const multisigDeposit = useUnit(formModel.$multisigDeposit);

  if (!network || !initiator.value) {
    return null;
  }
  const multisig = route.find(accountUtils.isMultisigAccount);

  return (
    <div className="flex flex-col gap-y-2">
      {multisig && (
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
          <Fee fee={multisigDeposit.toString()} asset={network.chain.assets[0]} />
        </DetailRow>
      )}

      <FeeWithLabel
        label={t('staking.networkFee', { count: 1 })}
        asset={network.chain.assets[0]}
        fee={fee.toString()}
        isLoading={pendingFee}
      />
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
