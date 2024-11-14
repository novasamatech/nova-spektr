import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';
import { type FormEvent } from 'react';

import { type MultisigAccount } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { formatBalance, toAddress } from '@/shared/lib/utils';
import { Button, InputHint, MultiSelect } from '@/shared/ui';
import { Address } from '@/shared/ui-entities';
import { AssetBalance } from '@/entities/asset';
import { SignatorySelector } from '@/entities/operations';
import { FeeWithLabel, MultisigDepositWithLabel } from '@/entities/transaction';
import { ProxyWalletAlert } from '@/entities/wallet';
import { AmountInput } from '@/features/assets-balances';
import { networkSelectorModel } from '@/features/governance';
import { unlockFormAggregate } from '../aggregates/unlockForm';

type Props = {
  onGoBack: () => void;
};

export const UnlockForm = ({ onGoBack }: Props) => {
  const { submit } = useForm(unlockFormAggregate.$unlockForm);

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <div className="px-5 pb-4">
      <form id="transfer-form" className="mt-4 flex flex-col gap-y-4" onSubmit={submitForm}>
        <ProxyFeeAlert />
        <AccountsSelector />
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
    fields: { shards },
  } = useForm(unlockFormAggregate.$unlockForm);

  const fee = useUnit(unlockFormAggregate.$fee);
  const balance = useUnit(unlockFormAggregate.$proxyBalance);
  const network = useUnit(networkSelectorModel.$network);
  const proxyWallet = useUnit(unlockFormAggregate.$proxyWallet);

  if (!network || !proxyWallet || !shards.hasError()) {
    return null;
  }

  const formattedFee = formatBalance(fee, network.asset.precision).value;
  const formattedBalance = formatBalance(balance, network.asset.precision).value;

  return (
    <ProxyWalletAlert
      wallet={proxyWallet}
      fee={formattedFee}
      balance={formattedBalance}
      symbol={network.asset.symbol}
      onClose={shards.resetErrors}
    />
  );
};

const AccountsSelector = () => {
  const { t } = useI18n();

  const {
    fields: { shards },
  } = useForm(unlockFormAggregate.$unlockForm);

  const accounts = useUnit(unlockFormAggregate.$accounts);
  const network = useUnit(networkSelectorModel.$network);
  const chain = useUnit(networkSelectorModel.$governanceChain);

  if (!network || !chain || accounts.length <= 1) {
    return null;
  }

  const options = accounts.map(({ account, balance }) => {
    const address = toAddress(account.accountId, { prefix: chain.addressPrefix });

    return {
      id: account.id.toString(),
      value: account,
      element: (
        <div className="flex w-full justify-between" key={account.id}>
          <Address address={address} variant="truncate" iconSize={20} canCopy={false} title={account.name} showIcon />
          <AssetBalance value={balance} asset={network.asset} className="w-min" />
        </div>
      ),
    };
  });

  return (
    <div className="flex flex-col gap-y-2">
      <MultiSelect
        label={t('operation.selectAccountLabel')}
        placeholder={t('operation.selectAccount')}
        multiPlaceholder={t('governance.operations.selectPlaceholder')}
        invalid={shards.hasError()}
        selectedIds={shards.value.map((acc) => acc.id.toString())}
        options={options}
        onChange={(values) => shards.onChange(values.map(({ value }) => value))}
      />
      <InputHint variant="error" active={shards.hasError()}>
        {t(shards.errorText())}
      </InputHint>
    </div>
  );
};

const Signatories = () => {
  const { t } = useI18n();

  const {
    fields: { signatory },
  } = useForm(unlockFormAggregate.$unlockForm);

  const signatories = useUnit(unlockFormAggregate.$signatories);
  const isMultisig = useUnit(unlockFormAggregate.$isMultisig);
  const chain = useUnit(networkSelectorModel.$governanceChain);

  if (!isMultisig || !chain) {
    return null;
  }

  return (
    <SignatorySelector
      signatory={signatory.value}
      signatories={signatories[0]}
      asset={chain.assets[0]}
      addressPrefix={chain.addressPrefix}
      hasError={signatory.hasError()}
      errorText={t(signatory.errorText())}
      onChange={signatory.onChange}
    />
  );
};

const Amount = () => {
  const { t } = useI18n();

  const {
    fields: { amount },
  } = useForm(unlockFormAggregate.$unlockForm);

  const network = useUnit(networkSelectorModel.$network);
  if (!network) {
    return null;
  }

  return (
    <div className="flex flex-col gap-y-2">
      <AmountInput
        disabled
        invalid={amount.hasError()}
        value={formatBalance(amount.value, network.asset.precision).value}
        balance={amount.value}
        placeholder={t('general.input.amountLabel')}
        asset={network.asset}
      />
      <InputHint active={amount.hasError()} variant="error">
        {t(amount.errorText())}
      </InputHint>
    </div>
  );
};

const FeeSection = () => {
  const { t } = useI18n();

  const {
    fields: { shards },
  } = useForm(unlockFormAggregate.$unlockForm);

  const api = useUnit(unlockFormAggregate.$api);
  const chain = useUnit(networkSelectorModel.$governanceChain);
  const transactions = useUnit(unlockFormAggregate.$transactions);
  const isMultisig = useUnit(unlockFormAggregate.$isMultisig);

  if (!chain || shards.value.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-y-2">
      {isMultisig && (
        <MultisigDepositWithLabel
          api={api}
          asset={chain.assets[0]}
          threshold={(shards.value[0] as MultisigAccount).threshold || 1}
          onDepositChange={unlockFormAggregate.events.multisigDepositChanged}
        />
      )}

      <FeeWithLabel
        label={t('operation.networkFee', { count: shards.value.length || 1 })}
        api={api}
        asset={chain.assets[0]}
        transaction={transactions?.[0]?.wrappedTx}
        onFeeChange={unlockFormAggregate.events.feeChanged}
        onFeeLoading={unlockFormAggregate.events.isFeeLoadingChanged}
      />

      {transactions && transactions.length > 1 && (
        <FeeWithLabel
          label={t('operation.networkFeeTotal')}
          api={api}
          asset={chain.assets[0]}
          multiply={transactions.length}
          transaction={transactions[0].wrappedTx}
          onFeeChange={unlockFormAggregate.events.totalFeeChanged}
          onFeeLoading={unlockFormAggregate.events.isFeeLoadingChanged}
        />
      )}
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
