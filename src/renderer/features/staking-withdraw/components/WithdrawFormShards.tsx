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
import { formModelShards } from '../model/form-model-shards';

type Props = {
  onGoBack: () => void;
};

export const WithdrawFormShards = ({ onGoBack }: Props) => {
  const { submit } = useForm(formModelShards.$withdrawForm);

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
  } = useForm(formModelShards.$withdrawForm);

  const fee = useUnit(formModelShards.$fee);
  const balance = useUnit(formModelShards.$proxyBalance);
  const network = useUnit(formModelShards.$networkStore);
  const proxyWallet = useUnit(formModelShards.$proxyWallet);

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
  } = useForm(formModelShards.$withdrawForm);

  const accounts = useUnit(formModelShards.$accounts);
  const network = useUnit(formModelShards.$networkStore);
  const wallet = useUnit(walletSelect.$selectedWallet);

  if (!network || accounts.length <= 1 || walletUtils.isFlexibleMultisig(wallet)) {
    return null;
  }

  const options = accounts.map(({ account, balances }) => {
    const isShard = accountUtils.isVaultShardAccount(account);
    const address = toAddress(account.accountId, { prefix: network.chain.addressPrefix });
    const id = accountService.uniqId(account);

    return {
      id,
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
          <AssetBalance value={balances.withdraw} asset={network.asset} />
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
  } = useForm(formModelShards.$withdrawForm);

  const withdrawBalance = useUnit(formModelShards.$withdrawBalance);
  const isStakingLoading = useUnit(formModelShards.$isStakingLoading);
  const network = useUnit(formModelShards.$networkStore);

  if (!network) {
    return null;
  }

  return (
    <div className="flex flex-col gap-y-2">
      <AmountInput
        disabled
        invalid={amount.hasError()}
        value={formatBalance(amount.value, network.asset.precision).value}
        balance={isStakingLoading ? null : withdrawBalance}
        balancePlaceholder={t('general.input.availableLabel')}
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
  } = useForm(formModelShards.$withdrawForm);

  const api = useUnit(formModelShards.$api);
  const network = useUnit(formModelShards.$networkStore);
  const transactions = useUnit(formModelShards.$transactions);
  const isMultisig = useUnit(formModelShards.$isMultisig);

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
          onDepositChange={formModelShards.events.multisigDepositChanged}
        />
      )}

      <FeeWithLabelWithDataLoading
        label={t('staking.networkFee', { count: shards.value.length || 1 })}
        api={api}
        asset={getNativeAsset(network.chain.assets)!}
        transaction={transactions?.[0]?.wrappedTx}
        onFeeChange={formModelShards.events.feeChanged}
        onFeeLoading={formModelShards.events.isFeeLoadingChanged}
      />

      {transactions && transactions.length > 1 && (
        <FeeWithLabelWithDataLoading
          label={t('staking.networkFeeTotal')}
          api={api}
          asset={getNativeAsset(network.chain.assets)!}
          multiply={transactions.length}
          transaction={transactions[0]?.wrappedTx}
          onFeeChange={formModelShards.events.totalFeeChanged}
          onFeeLoading={formModelShards.events.isFeeLoadingChanged}
        />
      )}
    </div>
  );
};

const ActionsSection = ({ onGoBack }: Props) => {
  const { t } = useI18n();

  const canSubmit = useUnit(formModelShards.$canSubmit);

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
