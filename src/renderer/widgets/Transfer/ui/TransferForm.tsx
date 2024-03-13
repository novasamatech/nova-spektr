import { useForm } from 'effector-forms';
import { Trans } from 'react-i18next';
import { FormEvent } from 'react';
import { useUnit } from 'effector-react';

import { Select, Input, Identicon, Icon, Button, InputHint, AmountInput } from '@shared/ui';
import { formModel } from '../model/form-model';
import { useI18n } from '@app/providers';
import { DropdownOption } from '@shared/ui/Dropdowns/common/types';
import { Chain } from '@shared/core';
import { accountUtils, AccountAddress } from '@entities/wallet';
import { toAddress } from '@shared/lib/utils';
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
    <form className="w-full" onSubmit={submitForm}>
      <AccountsSelector />
      <SignatorySelector />
      <ChainSelector />
      <Destination />
      <Amount />
      <Description />
      <div className="flex flex-col gap-y-6 pt-6 pb-4">
        <FeeSection />
      </div>
      <ButtonsSection onGoBack={onGoBack} />

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
  );
};

const AccountsSelector = () => {
  const { t } = useI18n();

  const {
    fields: { accounts },
  } = useForm(formModel.$transferForm);

  const signatories = useUnit(formModel.$signatories);
  const isMultisig = useUnit(formModel.$isMultisig);

  const options = signatories.map(({ signer, balance }) => {
    const isShard = accountUtils.isShardAccount(signer);
    const address = toAddress(signer.accountId, { prefix: chain.value.addressPrefix });

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
          <AssetBalance value={balance} asset={chain.value.assets[0]} />
        </div>
      ),
    };
  });

  return (
    <div className="flex flex-col gap-y-2">
      <Select
        label={t('proxy.addProxy.signatoryLabel')}
        placeholder={t('proxy.addProxy.signatoryPlaceholder')}
        selectedId={accounts.value.id.toString()}
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

const SignatorySelector = () => {
  const { t } = useI18n();

  const {
    fields: { chain, signatory },
  } = useForm(formModel.$transferForm);

  const signatories = useUnit(formModel.$signatories);
  const isMultisig = useUnit(formModel.$isMultisig);

  if (!isMultisig) return null;

  const options = signatories.map(({ signer, balance }) => {
    const isShard = accountUtils.isShardAccount(signer);
    const address = toAddress(signer.accountId, { prefix: chain.value.addressPrefix });

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
          <AssetBalance value={balance} asset={chain.value.assets[0]} />
        </div>
      ),
    };
  });

  return (
    <div className="flex flex-col gap-y-2">
      <Select
        label={t('proxy.addProxy.signatoryLabel')}
        placeholder={t('proxy.addProxy.signatoryPlaceholder')}
        selectedId={signatory.value.id.toString()}
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

const ChainSelector = () => {
  const { t } = useI18n();

  const {
    fields: { chain },
  } = useForm(formModel.$transferForm);

  const options = [] as DropdownOption<Chain>[];

  return (
    // {Boolean(destinations?.length) && (
    <Select
      label={t('transfer.destinationChainLabel')}
      placeholder={t('transfer.destinationChainPlaceholder')}
      invalid={chain.hasError()}
      selectedId={chain.value.chainId}
      options={options}
      onChange={({ value }) => chain.onChange(value)}
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
        balance={accountBalance}
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
        <Trans t={t} i18nKey="transfer.descriptionLengthError" values={{ maxLength: DESCRIPTION_MAX_LENGTH }} />
      </InputHint>
    </div>
  );
  // rules={{ maxLength: DESCRIPTION_MAX_LENGTH }}
};

const FeeSection = () => {
  return <div>123</div>;
};

const ButtonsSection = ({ onGoBack }: Props) => {
  const { t } = useI18n();

  const canSubmit = useUnit(formModel.$canSubmit);

  return (
    <div className="flex justify-between items-center mt-4">
      <Button variant="text" onClick={onGoBack}>
        {t('operation.goBackButton')}
      </Button>
      <Button form="add-proxy-form" type="submit" disabled={!canSubmit}>
        {t('transfer.continueButton')}
      </Button>
    </div>
  );
};
