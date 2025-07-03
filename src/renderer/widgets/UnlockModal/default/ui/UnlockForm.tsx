import { useUnit } from 'effector-react';
import { type FormEvent, useMemo } from 'react';

import { type MultisigAccount } from '@/shared/core';
import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { formatBalance, transferableAmount } from '@/shared/lib/utils';
import { Button, InputHint } from '@/shared/ui';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { SignatorySelector } from '@/entities/operations';
import { FeeWithLabel, MultisigDepositWithLabel } from '@/entities/transaction';
import { AmountInput } from '@/features/assets-balances';
import { networkSelectorModel } from '@/features/governance';
import { unlockFormAggregate } from '../model/unlockForm';

type Props = {
  onGoBack: () => void;
};

export const UnlockForm = ({ onGoBack }: Props) => {
  const { submit } = useForm(unlockFormAggregate.form);

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <div className="px-5 pb-4">
      <form id="transfer-form" className="mt-4 flex flex-col gap-y-4" onSubmit={submitForm}>
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

const Signatories = () => {
  const { t } = useI18n();

  const {
    fields: { signatory },
  } = useForm(unlockFormAggregate.form);

  const signatories = useUnit(unlockFormAggregate.$signatories);
  const isMultisig = useUnit(unlockFormAggregate.$isMultisig);
  const network = useUnit(networkSelectorModel.$network);
  const balances = useUnit(balanceModel.$balances);

  const signatoriesWithBalance = useMemo(() => {
    if (!network) {
      return [];
    }

    return signatories.map((signatory) => {
      const balance = balanceUtils.getBalance(
        balances,
        signatory.accountId,
        network.chain.chainId,
        network.asset.assetId.toString(),
      );
      return { signer: signatory, balance: transferableAmount(balance) };
    });
  }, [signatories, balances, network]);

  if (!isMultisig || !network?.chain || signatoriesWithBalance.length < 2) {
    return null;
  }

  return (
    <SignatorySelector
      signatory={signatory.value}
      signatories={signatoriesWithBalance}
      asset={network.chain.assets[0]}
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
  } = useForm(unlockFormAggregate.form);

  const network = useUnit(networkSelectorModel.$network);
  if (!network) {
    return null;
  }

  return (
    <div className="flex flex-col gap-y-2">
      <AmountInput
        disabled
        invalid={amount.hasError}
        value={formatBalance(amount.value, network.asset.precision).value}
        balance={amount.value}
        placeholder={t('general.input.amountLabel')}
        asset={network.asset}
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
  } = useForm(unlockFormAggregate.form);

  const api = useUnit(unlockFormAggregate.$api);
  const chain = useUnit(networkSelectorModel.$governanceChain);
  const isMultisig = useUnit(unlockFormAggregate.$isMultisig);
  const fee = useUnit(unlockFormAggregate.$fee);
  const pendingFee = useUnit(unlockFormAggregate.$pendingFee);

  if (!chain || !initiator) {
    return null;
  }

  return (
    <div className="flex flex-col gap-y-2">
      {isMultisig && (
        <MultisigDepositWithLabel
          api={api}
          asset={chain.assets[0]}
          threshold={(initiator.value as MultisigAccount).threshold || 1}
          onDepositChange={unlockFormAggregate.multisigDepositChanged}
        />
      )}

      <FeeWithLabel
        label={t('staking.networkFee', { count: 1 })}
        asset={chain.assets[0]}
        fee={fee.toString()}
        isLoading={pendingFee}
      />
    </div>
  );
};

const ActionsSection = ({ onGoBack }: Props) => {
  const { t } = useI18n();

  const canSubmit = useUnit(unlockFormAggregate.$canSubmit);

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
