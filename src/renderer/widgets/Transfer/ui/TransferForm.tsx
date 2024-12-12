import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';
import { type FormEvent } from 'react';

import { type Chain, type MultisigAccount } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { formatBalance, toAddress, toShortAddress, validateAddress } from '@/shared/lib/utils';
import { AmountInput, Button, HelpText, Icon, Identicon, Input, InputHint, Select } from '@/shared/ui';
import { AssetBalance } from '@/entities/asset';
import { ChainTitle } from '@/entities/chain';
import { SignatorySelector } from '@/entities/operations';
import { FeeWithLabel, MultisigDepositWithLabel, XcmFeeWithLabel } from '@/entities/transaction';
import { AccountAddress, AccountSelectModal, ProxyWalletAlert, accountUtils } from '@/entities/wallet';
import { formModel } from '../model/form-model';

type Props = {
  onGoBack: () => void;
};

export const TransferForm = ({ onGoBack }: Props) => {
  const { submit } = useForm(formModel.$transferForm);

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <div className="px-5 pb-4">
      <form id="transfer-form" className="mt-4 flex flex-col gap-y-4" onSubmit={submitForm}>
        <ProxyFeeAlert />
        <XcmChainSelector />
        <AccountSelector />
        <Signatories />
        <Destination />
        <Amount />
      </form>
      <div className="flex flex-col gap-y-6 pb-4 pt-6">
        <FeeSection />
      </div>
      <ActionsSection onGoBack={onGoBack} />

      <MyselfAccountModal />
    </div>
  );
};

const ProxyFeeAlert = () => {
  const {
    fields: { account },
  } = useForm(formModel.$transferForm);

  const fee = useUnit(formModel.$fee);
  const { native } = useUnit(formModel.$proxyBalance);
  const network = useUnit(formModel.$networkStore);
  const proxyWallet = useUnit(formModel.$proxyWallet);

  if (!network || !proxyWallet || !account.hasError()) {
    return null;
  }

  const formattedFee = formatBalance(fee, network.asset.precision).value;
  const formattedBalance = formatBalance(native, network.asset.precision).value;

  return (
    <ProxyWalletAlert
      wallet={proxyWallet}
      fee={formattedFee}
      balance={formattedBalance}
      symbol={network.asset.symbol}
      onClose={account.resetErrors}
    />
  );
};

const AccountSelector = () => {
  const { t } = useI18n();

  const {
    fields: { account },
  } = useForm(formModel.$transferForm);

  const accounts = useUnit(formModel.$accounts);
  const network = useUnit(formModel.$networkStore);

  if (!network || accounts.length <= 1) {
    return null;
  }

  const options = accounts.map(({ account, balances }) => {
    const isShard = accountUtils.isShardAccount(account);
    const address = toAddress(account.accountId, { prefix: network.chain.addressPrefix });

    return {
      id: account.id.toString(),
      value: account,
      element: (
        <div className="flex w-full justify-between" key={account.id}>
          <AccountAddress
            size={20}
            type="short"
            address={address}
            name={isShard ? toShortAddress(address, 16) : account.name}
            canCopy={false}
          />
          <AssetBalance value={balances.balance} asset={network.asset} />
        </div>
      ),
    };
  });

  return (
    <div className="flex flex-col gap-y-2">
      <Select
        label={t('operation.selectAccountLabel')}
        placeholder={t('operation.selectAccount')}
        selectedId={account.value.id?.toString()}
        options={options}
        onChange={({ value }) => account.onChange(value)}
      />
    </div>
  );
};

const Signatories = () => {
  const { t } = useI18n();

  const {
    fields: { signatory },
  } = useForm(formModel.$transferForm);

  const signatories = useUnit(formModel.$signatories);
  const isMultisig = useUnit(formModel.$isMultisig);
  const network = useUnit(formModel.$networkStore);

  if (!isMultisig || !network) {
    return null;
  }

  return (
    <SignatorySelector
      signatory={signatory.value}
      signatories={signatories[0]}
      asset={network.chain.assets[0]}
      addressPrefix={network.chain.addressPrefix}
      hasError={signatory.hasError()}
      errorText={t(signatory.errorText())}
      onChange={signatory.onChange}
    />
  );
};

const XcmChainSelector = () => {
  const { t } = useI18n();

  const {
    fields: { xcmChain },
  } = useForm(formModel.$transferForm);

  const chains = useUnit(formModel.$chains);

  if (chains.length <= 1) {
    return null;
  }

  const getXcmOptions = (chains: Chain[]) => {
    const [nativeLabel, xcmLabel] = ['transfer.onChainPlaceholder', 'transfer.crossChainPlaceholder'].map(
      (title, index) => ({
        id: index.toString(),
        value: index.toString(),
        element: <HelpText className="text-text-secondary">{t(title)}</HelpText>,
        disabled: true,
      }),
    );
    const [nativeChain, ...xcmChains] = chains.map((chain) => ({
      id: chain.chainId,
      value: chain,
      element: <ChainTitle chainId={chain.chainId} fontClass="text-text-primary" />,
    }));

    return [nativeLabel, nativeChain, xcmLabel, ...xcmChains];
  };

  return (
    <Select
      label={t('transfer.destinationChainLabel')}
      placeholder={t('transfer.destinationChainPlaceholder')}
      invalid={xcmChain.hasError()}
      selectedId={xcmChain.value.chainId}
      options={getXcmOptions(chains)}
      onChange={({ value }) => xcmChain.onChange(value)}
    />
  );
};

const Destination = () => {
  const { t } = useI18n();

  const {
    fields: { destination },
  } = useForm(formModel.$transferForm);

  const isMyselfXcmEnabled = useUnit(formModel.$isMyselfXcmEnabled);

  const prefixElement = (
    <div className="flex h-auto items-center">
      {validateAddress(destination.value) ? (
        <Identicon className="mr-2" size={20} address={destination.value} background={false} />
      ) : (
        <Icon className="mr-2" size={20} name="emptyIdenticon" />
      )}
    </div>
  );

  const suffixElement = (
    <Button size="sm" pallet="secondary" onClick={() => formModel.events.myselfClicked()}>
      {t('transfer.myselfButton')}
    </Button>
  );

  return (
    <div className="flex flex-col gap-y-2">
      <Input
        wrapperClass="w-full h-10.5"
        label={t('transfer.recipientLabel')}
        placeholder={t('transfer.recipientPlaceholder')}
        invalid={destination.hasError()}
        value={destination.value}
        prefixElement={prefixElement}
        suffixElement={isMyselfXcmEnabled && suffixElement}
        onChange={destination.onChange}
      />
      <InputHint active={destination.hasError()} variant="error">
        {t(destination.errorText())}
      </InputHint>
    </div>
  );
};

const Amount = () => {
  const { t } = useI18n();

  const {
    fields: { amount },
  } = useForm(formModel.$transferForm);

  const { balance } = useUnit(formModel.$accountBalance);
  const network = useUnit(formModel.$networkStore);

  if (!network) {
    return null;
  }

  return (
    <div className="flex flex-col gap-y-2">
      <AmountInput
        invalid={amount.hasError()}
        value={amount.value}
        balance={balance}
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
  const {
    fields: { account },
  } = useForm(formModel.$transferForm);

  const api = useUnit(formModel.$api);
  const network = useUnit(formModel.$networkStore);
  const transaction = useUnit(formModel.$transaction);
  const coreTx = useUnit(formModel.$coreTx);
  const fakeTx = useUnit(formModel.$fakeTx);
  const isMultisig = useUnit(formModel.$isMultisig);
  const isXcm = useUnit(formModel.$isXcm);
  const xcmConfig = useUnit(formModel.$xcmConfig);
  const xcmApi = useUnit(formModel.$xcmApi);

  if (!network) {
    return null;
  }

  return (
    <div className="flex flex-col gap-y-2">
      {isMultisig && (
        <MultisigDepositWithLabel
          api={api}
          asset={network.chain.assets[0]}
          threshold={(account.value as MultisigAccount).threshold || 1}
          onDepositChange={formModel.events.multisigDepositChanged}
        />
      )}

      <FeeWithLabel
        api={api}
        asset={network.chain.assets[0]}
        transaction={transaction?.wrappedTx || fakeTx}
        onFeeChange={formModel.events.feeChanged}
        onFeeLoading={formModel.events.isFeeLoadingChanged}
      />

      {isXcm && xcmApi && xcmConfig && (
        <XcmFeeWithLabel
          api={xcmApi}
          config={xcmConfig}
          asset={network.asset}
          transaction={coreTx || fakeTx}
          onFeeChange={formModel.events.xcmFeeChanged}
          onFeeLoading={formModel.events.isXcmFeeLoadingChanged}
        />
      )}
    </div>
  );
};

const MyselfAccountModal = () => {
  const {
    fields: { xcmChain },
  } = useForm(formModel.$transferForm);

  const isXcm = useUnit(formModel.$isXcm);
  const network = useUnit(formModel.$networkStore);
  const destinationAccounts = useUnit(formModel.$destinationAccounts);
  const isMyselfXcmOpened = useUnit(formModel.$isMyselfXcmOpened);

  if (!isXcm || !network || destinationAccounts.length === 0) {
    return null;
  }

  return (
    <AccountSelectModal
      isOpen={isMyselfXcmOpened}
      accounts={destinationAccounts}
      chain={xcmChain.value}
      onClose={formModel.events.xcmDestinationCancelled}
      onSelect={({ accountId }) => formModel.events.xcmDestinationSelected(accountId)}
    />
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
