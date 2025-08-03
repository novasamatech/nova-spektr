import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';
import { type FormEvent } from 'react';

import { type MultisigAccount } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { formatBalance, getNativeAsset, toAddress, toShortAddress } from '@/shared/lib/utils';
import { Button, InputHint, MultiSelect } from '@/shared/ui';
import { AssetBalance } from '@/shared/ui-entities';
import { accountService } from '@/domains/network';
import { FeeWithLabelWithDataLoading, MultisigDepositWithLabel } from '@/entities/transaction';
import { AccountAddress, ProxyWalletAlert, accountUtils, walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { AmountInput } from '@/features/assets-balances';
import { formModel } from '../model/form-model';

type Props = {
  onGoBack: () => void;
};

export const UnstakeForm = ({ onGoBack }: Props) => {
  const { submit } = useForm(formModel.$unstakeForm);

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <div className="px-5 pb-4">
      <form id="transfer-form" className="mt-4 flex flex-col gap-y-4" onSubmit={submitForm}>
        <ProxyFeeAlert />
        <AccountsSelector />
        <Amount />
      </form>
      <div className="flex flex-col gap-y-6 pt-6 pb-4">
        <FeeSection />
      </div>
      <ActionsSection onGoBack={onGoBack} />
    </div>
  );
};

const ProxyFeeAlert = () => {
  const {
    fields: { shards },
  } = useForm(formModel.$unstakeForm);

  const fee = useUnit(formModel.$fee);
  const balance = useUnit(formModel.$proxyBalance);
  const network = useUnit(formModel.$networkStore);
  const proxyWallet = useUnit(formModel.$proxyWallet);

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
  } = useForm(formModel.$unstakeForm);

  const accounts = useUnit(formModel.$accounts);
  const network = useUnit(formModel.$networkStore);
  const wallet = useUnit(walletSelect.$selectedWallet);

  if (!network || accounts.length <= 1 || walletUtils.isFlexibleMultisig(wallet)) {
    return null;
  }

  const options = accounts.map(({ account, balances }) => {
    const isShard = accountUtils.isVaultShardAccount(account);
    const address = toAddress(account.accountId, { prefix: network.chain.addressPrefix });
    const id = accountService.uniqId(account);

    return {
      id: id,
      value: account,
      element: (
        <div className="flex w-full justify-between" key={id}>
          <AccountAddress
            size={20}
            type="short"
            address={address}
            name={isShard ? toShortAddress(address, 16) : account.name}
            canCopy={false}
          />
          <AssetBalance value={balances.stake} asset={network.asset} />
        </div>
      ),
    };
  });

  return (
    <div className="flex flex-col gap-y-2">
      <MultiSelect
        label={t('staking.bond.accountLabel')}
        placeholder={t('staking.bond.accountPlaceholder')}
        multiPlaceholder={t('staking.bond.manyAccountsPlaceholder')}
        invalid={shards.hasError()}
        selectedIds={shards.value.map(accountService.uniqId)}
        options={options}
        onChange={(values) => shards.onChange(values.map(({ value }) => value))}
      />
      <InputHint variant="error" active={shards.hasError()}>
        {t(shards.errorText())}
      </InputHint>
    </div>
  );
};

const Amount = () => {
  const { t } = useI18n();

  const {
    fields: { amount },
  } = useForm(formModel.$unstakeForm);

  const unstakeBalanceRange = useUnit(formModel.$unstakeBalanceRange);
  const isStakingLoading = useUnit(formModel.$isStakingLoading);
  const network = useUnit(formModel.$networkStore);

  if (!network) {
    return null;
  }

  return (
    <div className="flex flex-col gap-y-2">
      <AmountInput
        invalid={amount.hasError()}
        value={amount.value}
        balance={isStakingLoading ? null : unstakeBalanceRange}
        balancePlaceholder={t('general.input.availableLabel')}
        placeholder={t('general.input.amountLabel')}
        asset={network.asset}
        onChange={amount.onChange}
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
  } = useForm(formModel.$unstakeForm);

  const api = useUnit(formModel.$api);
  const network = useUnit(formModel.$networkStore);
  const transactions = useUnit(formModel.$transactions);
  const isMultisig = useUnit(formModel.$isMultisig);

  if (!network || shards.value.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-y-2">
      {isMultisig && (
        <MultisigDepositWithLabel
          api={api}
          asset={getNativeAsset(network.chain.assets)!}
          threshold={(shards.value[0] as MultisigAccount).threshold || 1}
          onDepositChange={formModel.events.multisigDepositChanged}
        />
      )}

      <FeeWithLabelWithDataLoading
        label={t('staking.networkFee', { count: shards.value.length || 1 })}
        api={api}
        asset={getNativeAsset(network.chain.assets)!}
        transaction={transactions?.[0]?.wrappedTx}
        onFeeChange={formModel.events.feeChanged}
        onFeeLoading={formModel.events.isFeeLoadingChanged}
      />

      {transactions && transactions.length > 1 && (
        <FeeWithLabelWithDataLoading
          label={t('staking.networkFeeTotal')}
          api={api}
          asset={getNativeAsset(network.chain.assets)!}
          multiply={transactions.length}
          transaction={transactions[0].wrappedTx}
          onFeeChange={formModel.events.totalFeeChanged}
          onFeeLoading={formModel.events.isFeeLoadingChanged}
        />
      )}
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
