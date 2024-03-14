import { useForm } from 'effector-forms';
import { FormEvent, useState } from 'react';
import { useUnit } from 'effector-react';

import { Select, Input, Identicon, Icon, Button, InputHint, AmountInput, Alert } from '@shared/ui';
import { formModel } from '../model/form-model';
import { useI18n } from '@app/providers';
import { DropdownOption } from '@shared/ui/Dropdowns/common/types';
import { Chain } from '@shared/core';
import { accountUtils, AccountAddress } from '@entities/wallet';
import { toAddress, toShortAddress } from '@shared/lib/utils';
import { AssetBalance } from '@entities/asset';

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
    <div className="pb-4 px-5">
      <form id="transfer-form" className="flex flex-col gap-y-4 mt-4" onSubmit={submitForm}>
        <ProxyFeeAlert />
        <AccountSelector />
        <SignatorySelector />
        {/*<XcmChainSelector />*/}
        <Destination />
        <Amount />
        <Description />
        <div className="flex flex-col gap-y-6 pt-6 pb-4">
          <FeeSection />
        </div>
        <ActionsSection onGoBack={onGoBack} />

        {/*<InputHint className="mt-2" active={multisigTxExist} variant="error">*/}
        {/*  {t('transfer.multisigTransactionExist')}*/}
        {/*</InputHint>*/}

        {/*{accounts && (*/}
        {/*  <AccountSelectModal*/}
        {/*    isOpen={isSelectAccountModalOpen}*/}
        {/*    accounts={destinationChainAccounts}*/}
        {/*    chain={chain}*/}
        {/*    onClose={() => setSelectAccountModalOpen(false)}*/}
        {/*    onSelect={handleAccountSelect}*/}
        {/*  />*/}
        {/*)}*/}
      </form>
    </div>
  );
};

const ProxyFeeAlert = () => {
  const {
    fields: { amount },
  } = useForm(formModel.$transferForm);

  const [isAlertOpen, setIsAlertOpen] = useState(true);

  // const proxyWallet = useUnit(formModel.$proxyWallet);
  //
  // if (!proxyWallet) return null;

  return (
    <Alert
      title="Not enough tokens to pay the fee"
      variant="warn"
      active={isAlertOpen}
      onClose={() => setIsAlertOpen(false)}
    >
      <Alert.Item withDot={false}>
        Delegated authority
        {/*<WalletCardSm wallet={proxyWallet} />*/}
        doesn't have enough balance to pay the network fee of 0.00 DOT.
        <br />
        Available balance to pay fee: 0.00 DOT
      </Alert.Item>
    </Alert>
  );
};

const AccountSelector = () => {
  const { t } = useI18n();

  const {
    fields: { account },
  } = useForm(formModel.$transferForm);

  const accounts = useUnit(formModel.$accounts);
  const chain = useUnit(formModel.$chain);
  const asset = useUnit(formModel.$asset);

  if (!chain || !asset || accounts.length <= 1) return null;

  const options = accounts.map(({ account, balances }) => {
    const isShard = accountUtils.isShardAccount(account);
    const address = toAddress(account.accountId, { prefix: chain.addressPrefix });

    return {
      id: account.id.toString(),
      value: account,
      element: (
        <div className="flex justify-between w-full" key={account.id}>
          <AccountAddress
            size={20}
            type="short"
            address={address}
            name={isShard ? toShortAddress(address, 16) : account.name}
            canCopy={false}
          />
          <AssetBalance value={balances[0]} asset={asset} />
        </div>
      ),
    };
  });

  return (
    <div className="flex flex-col gap-y-2">
      <Select
        label={t('proxy.addProxy.accountLabel')}
        placeholder={t('proxy.addProxy.accountPlaceholder')}
        selectedId={account.value.id?.toString()}
        options={options}
        onChange={({ value }) => account.onChange(value)}
      />
    </div>
  );
};

const SignatorySelector = () => {
  const { t } = useI18n();

  const {
    fields: { signatory },
  } = useForm(formModel.$transferForm);

  const signatories = useUnit(formModel.$signatories);
  const isMultisig = useUnit(formModel.$isMultisig);
  const chain = useUnit(formModel.$chain);
  const asset = useUnit(formModel.$asset);

  if (!chain || !asset || !isMultisig) return null;

  const options = signatories.map(({ signer, balances }) => {
    const isShard = accountUtils.isShardAccount(signer);
    const address = toAddress(signer.accountId, { prefix: chain.addressPrefix });

    return {
      id: signer.id.toString(),
      value: signer,
      element: (
        <div className="flex justify-between items-center w-full">
          <AccountAddress
            size={20}
            type="short"
            address={address}
            name={isShard ? address : signer.name}
            canCopy={false}
          />
          <AssetBalance value={balances[0]} asset={asset} />
        </div>
      ),
    };
  });

  return (
    <div className="flex flex-col gap-y-2">
      <Select
        label={t('proxy.addProxy.signatoryLabel')}
        placeholder={t('proxy.addProxy.signatoryPlaceholder')}
        selectedId={signatory.value.id?.toString()}
        options={options}
        invalid={signatory.hasError()}
        onChange={({ value }) => signatory.onChange(value)}
      />
      <InputHint variant="error" active={signatory.hasError()}>
        {t(signatory.errorText())}
      </InputHint>
    </div>
  );
};

const XcmChainSelector = () => {
  const { t } = useI18n();

  const {
    fields: { xcmChain },
  } = useForm(formModel.$transferForm);

  const options = [] as DropdownOption<Chain>[];

  return (
    // {Boolean(destinations?.length) && (
    <Select
      label={t('transfer.destinationChainLabel')}
      placeholder={t('transfer.destinationChainPlaceholder')}
      invalid={xcmChain.hasError()}
      selectedId={xcmChain.value.chainId}
      options={options}
      onChange={({ value }) => xcmChain.onChange(value)}
    />
  );
};

const Destination = () => {
  const { t } = useI18n();

  const {
    fields: { destination },
  } = useForm(formModel.$transferForm);

  const prefixElement = (
    <div className="flex h-auto items-center">
      {!destination.value || destination.hasError() ? (
        <Icon className="mr-2" size={20} name="emptyIdenticon" />
      ) : (
        <Identicon className="mr-2" size={20} address={destination.value} background={false} />
      )}
    </div>
  );
  const suffixElement = (
    <Button size="sm" pallet="secondary" onClick={() => formModel.events.myselfClicked()}>
      {t('transfer.myselfButton')}
    </Button>
  );

  return (
    // rules={{ required: true, validate: validateAddress }}
    <div className="flex flex-col gap-y-2">
      <Input
        wrapperClass="w-full h-10.5"
        label={t('transfer.recipientLabel')}
        placeholder={t('transfer.recipientPlaceholder')}
        invalid={destination.hasError()}
        value={destination.value}
        prefixElement={prefixElement}
        suffixElement={suffixElement}
        onChange={destination.onChange}
      />
      <InputHint active={destination.hasError()} variant="error">
        {t(destination.errorText())}
      </InputHint>
      {/*<InputHint active={error?.type === 'validate'} variant="error">*/}
      {/*  {t('transfer.incorrectRecipientError')}*/}
      {/*</InputHint>*/}
      {/*<InputHint active={error?.type === 'required'} variant="error">*/}
      {/*  {t('transfer.requiredRecipientError')}*/}
      {/*</InputHint>*/}
    </div>
  );
};

const Amount = () => {
  const { t } = useI18n();

  const {
    fields: { amount },
  } = useForm(formModel.$transferForm);

  const [balance] = useUnit(formModel.$accountBalance);
  const asset = useUnit(formModel.$asset);

  if (!asset) return null;

  return (
    // required: true,
    // validate: {
    //   notZero: (v) => Number(v) > 0,
    //   insufficientBalance: validateBalance,
    //   insufficientBalanceForFee: validateBalanceForFee,
    //   insufficientBalanceForDeposit: validateBalanceForFeeAndDeposit,
    // },
    <div className="flex flex-col gap-y-2">
      <AmountInput
        invalid={amount.hasError()}
        value={amount.value}
        balance={balance}
        balancePlaceholder={t('general.input.availableLabel')}
        placeholder={t('general.input.amountLabel')}
        asset={asset}
        onChange={amount.onChange}
      />
      <InputHint active={amount.hasError()} variant="error">
        {t(amount.errorText())}
      </InputHint>
      {/*<InputHint active={error?.type === 'insufficientBalance'} variant="error">*/}
      {/*  {t('transfer.notEnoughBalanceError')}*/}
      {/*</InputHint>*/}
      {/*<InputHint active={error?.type === 'insufficientBalanceForFee'} variant="error">*/}
      {/*  {t('transfer.notEnoughBalanceForFeeError')}*/}
      {/*</InputHint>*/}
      {/*<InputHint active={error?.type === 'insufficientBalanceForDeposit'} variant="error">*/}
      {/*  {t('transfer.notEnoughBalanceForDepositError')}*/}
      {/*</InputHint>*/}
      {/*<InputHint active={error?.type === 'required'} variant="error">*/}
      {/*  {t('transfer.requiredAmountError')}*/}
      {/*</InputHint>*/}
      {/*<InputHint active={error?.type === 'notZero'} variant="error">*/}
      {/*  {t('transfer.requiredAmountError')}*/}
      {/*</InputHint>*/}
    </div>
  );
};

const Description = () => {
  const { t } = useI18n();

  const {
    fields: { description },
  } = useForm(formModel.$transferForm);

  const isMultisig = useUnit(formModel.$isMultisig);

  if (!isMultisig) return null;

  return (
    <div className="flex flex-col gap-y-2">
      <Input
        spellCheck
        className="w-full"
        label={t('general.input.descriptionLabel')}
        placeholder={t('general.input.descriptionPlaceholder')}
        invalid={description.hasError()}
        value={description.value}
        onChange={description.onChange}
      />
      <InputHint active={description.hasError()} variant="error">
        {t(description.errorText())}
      </InputHint>
    </div>
  );
};

const FeeSection = () => {
  return <div>123</div>;
};

const ActionsSection = ({ onGoBack }: Props) => {
  const { t } = useI18n();

  const canSubmit = useUnit(formModel.$canSubmit);

  return (
    <div className="flex justify-between items-center mt-4">
      <Button variant="text" onClick={onGoBack}>
        {t('operation.goBackButton')}
      </Button>
      <Button form="transfer-form" type="submit" disabled={!canSubmit}>
        {t('transfer.continueButton')}
      </Button>
    </div>
  );
};
