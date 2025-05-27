import { useUnit } from 'effector-react';
import { type FormEvent, useMemo } from 'react';

import { type MultisigAccount } from '@/shared/core';
import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { formatBalance, toAddress, toShortAddress, transferableAmount } from '@/shared/lib/utils';
import { Button, InputHint, MultiSelect } from '@/shared/ui';
import { type DropdownOption } from '@/shared/ui/types';
import { AssetBalance } from '@/shared/ui-entities';
import { accountService } from '@/domains/network';
import { balanceUtils } from '@/entities/balance';
import { SignatorySelector } from '@/entities/operations';
import { FeeWithLabelWithoutDataLoading, MultisigDepositWithLabel } from '@/entities/transaction';
import { AccountAddress, ProxyWalletAlert, accountUtils, walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { AmountInput } from '@/features/assets-balances';
import { formModel } from '../model/form-model';

type Props = {
  onGoBack: () => void;
};

export const WithdrawForm = ({ onGoBack }: Props) => {
  const { submit } = useForm(formModel.form);

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <div className="px-5 pb-4">
      <form id="transfer-form" className="mt-4 flex flex-col gap-y-4" onSubmit={submitForm}>
        <ProxyFeeAlert />
        {/* todo seems like we don't need to select anything if we have only 1 account */}
        {/* <AccountsSelector /> */}
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
  const balance = useUnit(formModel.$proxyBalance);
  const network = useUnit(formModel.$networkStore);
  const proxyWallet = useUnit(formModel.$proxyWallet);

  if (!network || !proxyWallet || !initiator.hasError) {
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
      onClose={initiator.reset}
    />
  );
};

const AccountsSelector = () => {
  const { t } = useI18n();

  const {
    fields: { initiator },
  } = useForm(formModel.form);

  const account = useUnit(formModel.$account);
  const network = useUnit(formModel.$networkStore);
  const wallet = useUnit(walletSelect.$selectedWallet);

  if (!network || !account || walletUtils.isFlexibleMultisig(wallet)) {
    return null;
  }

  const options: DropdownOption[] = [];
  if (account) {
    const { account: currentAccount, balances } = account;
    const isShard = accountUtils.isVaultShardAccount(currentAccount);
    const address = toAddress(currentAccount.accountId, { prefix: network.chain.addressPrefix });
    const id = accountService.uniqId(currentAccount);

    options.push({
      id,
      value: account,
      element: (
        <div className="flex w-full justify-between" key={id}>
          <AccountAddress
            size={20}
            type="short"
            address={address}
            name={isShard ? toShortAddress(address, 16) : currentAccount.name}
            canCopy={false}
          />
          <AssetBalance value={balances.withdraw} asset={network.asset} />
        </div>
      ),
    });
  }

  return (
    <div className="flex flex-col gap-y-2">
      <MultiSelect
        label={t('staking.bond.accountLabel')}
        placeholder={t('staking.bond.accountPlaceholder')}
        multiPlaceholder={t('staking.bond.manyAccountsPlaceholder')}
        invalid={initiator.hasError}
        selectedIds={initiator.value ? [accountService.uniqId(initiator.value)] : []}
        options={options}
        onChange={(values) => initiator.onChange(values[0].value)}
      />
      <InputHint variant="error" active={initiator.hasError}>
        {t(initiator.errorMessage)}
      </InputHint>
    </div>
  );
};
AccountsSelector.displayName = 'AccountsSelector';

const Signatories = () => {
  const { t } = useI18n();

  const {
    fields: { signatory },
  } = useForm(formModel.form);

  const signatories = useUnit(formModel.$signatories);
  const network = useUnit(formModel.$networkStore);
  const isMultisig = useUnit(formModel.$isMultisig);
  const balances = useUnit(formModel.$balances);

  if (!isMultisig || !network) {
    return null;
  }

  const signatoryWithBalance = useMemo(() => {
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

  return (
    <SignatorySelector
      signatory={signatory.value}
      signatories={signatoryWithBalance}
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
  } = useForm(formModel.form);

  const withdrawBalance = useUnit(formModel.$withdrawBalance);
  const isStakingLoading = useUnit(formModel.$isStakingLoading);
  const network = useUnit(formModel.$networkStore);

  if (!network) {
    return null;
  }

  return (
    <div className="flex flex-col gap-y-2">
      <AmountInput
        disabled
        invalid={amount.hasError}
        value={formatBalance(amount.value, network.asset.precision).value}
        balance={isStakingLoading ? null : withdrawBalance}
        balancePlaceholder={t('general.input.availableLabel')}
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
  } = useForm(formModel.form);

  const api = useUnit(formModel.$api);
  const network = useUnit(formModel.$networkStore);
  const fee = useUnit(formModel.$fee);
  const pendingFee = useUnit(formModel.$pendingFee);
  const isMultisig = useUnit(formModel.$isMultisig);

  if (!network || !initiator.value) {
    return null;
  }

  return (
    <div className="flex flex-col gap-y-2">
      {isMultisig && (
        <MultisigDepositWithLabel
          api={api}
          asset={network.chain.assets[0]}
          threshold={(initiator.value as MultisigAccount).threshold || 1}
          onDepositChange={formModel.events.multisigDepositChanged}
        />
      )}

      <FeeWithLabelWithoutDataLoading
        label={t('staking.networkFee', { count: 1 })}
        asset={network.chain.assets[0]}
        fee={fee.toString()}
        isLoading={pendingFee}
      />

      {/* {transactions && transactions.length > 1 && (
        <FeeWithLabel
          label={t('staking.networkFeeTotal')}
          api={api}
          asset={network.chain.assets[0]}
          multiply={transactions.length}
          transaction={transactions[0].wrappedTx}
          onFeeChange={formModel.events.totalFeeChanged}
          onFeeLoading={formModel.events.isFeeLoadingChanged}
        />
      )} */}
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
