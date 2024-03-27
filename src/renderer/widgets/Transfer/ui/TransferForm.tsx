import { useForm } from 'effector-forms';
import { FormEvent } from 'react';
import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { MultisigAccount, Chain } from '@shared/core';
import { accountUtils, AccountAddress, WalletIcon } from '@entities/wallet';
import { toAddress, toShortAddress, validateAddress, formatBalance } from '@shared/lib/utils';
import { AssetBalance } from '@entities/asset';
import { MultisigDepositWithLabel, FeeWithLabel, XcmFeeWithLabel } from '@entities/transaction';
import { ChainTitle } from '@entities/chain';
import { formModel } from '../model/form-model';
import {
  Select,
  Input,
  Identicon,
  Icon,
  Button,
  InputHint,
  AmountInput,
  HelpText,
  Alert,
  FootnoteText,
} from '@shared/ui';

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
        <XcmChainSelector />
        <AccountSelector />
        <SignatorySelector />
        <Destination />
        <Amount />
        <Description />
      </form>
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
    </div>
  );
};

const ProxyFeeAlert = () => {
  const {
    fields: { account },
  } = useForm(formModel.$transferForm);

  const fee = useUnit(formModel.$fee);
  const [_, nativeBalance] = useUnit(formModel.$proxyBalance);
  const network = useUnit(formModel.$networkStore);
  const proxyWallet = useUnit(formModel.$proxyWallet);

  if (!network || !proxyWallet || !account.hasError()) return null;

  const formattedFee = formatBalance(fee, network.asset.precision).value;
  const formattedBalance = formatBalance(nativeBalance, network.asset.precision).value;

  return (
    <Alert active title="Not enough tokens to pay the fee" variant="warn" onClose={account.resetErrors}>
      <FootnoteText className="text-text-secondary tracking-tight max-w-full">
        Delegated authority
        <span className="inline-flex gap-x-1 items-center mx-1 align-bottom max-w-[200px]">
          <WalletIcon className="shrink-0" type={proxyWallet.type} size={16} />
          <FootnoteText as="span" className="text-text-secondary transition-colors truncate">
            {proxyWallet.name}
          </FootnoteText>
        </span>
        doesn&apos;t have enough balance to pay the network fee of {formattedFee} {network.asset.symbol}
        <br />
        Available balance to pay fee: {formattedBalance} {network.asset.symbol}
      </FootnoteText>
    </Alert>
  );
};

const AccountSelector = () => {
  const { t } = useI18n();

  const {
    fields: { account },
  } = useForm(formModel.$transferForm);

  const accounts = useUnit(formModel.$accounts);
  const network = useUnit(formModel.$networkStore);

  if (!network || accounts.length <= 1) return null;

  const options = accounts.map(({ account, balances }) => {
    const isShard = accountUtils.isShardAccount(account);
    const address = toAddress(account.accountId, { prefix: network.chain.addressPrefix });

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
          <AssetBalance value={balances[0]} asset={network.asset} />
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
  const network = useUnit(formModel.$networkStore);

  if (!network || !isMultisig) return null;

  const options = signatories[0].map(({ signer, balances }) => {
    const isShard = accountUtils.isShardAccount(signer);
    const address = toAddress(signer.accountId, { prefix: network.chain.addressPrefix });

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
          <AssetBalance value={balances[0]} asset={network.asset} />
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

  const chains = useUnit(formModel.$chains);

  if (chains.length <= 1) return null;

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

  const prefixElement = (
    <div className="flex h-auto items-center">
      {validateAddress(destination.value) ? (
        <Identicon className="mr-2" size={20} address={destination.value} background={false} />
      ) : (
        <Icon className="mr-2" size={20} name="emptyIdenticon" />
      )}
    </div>
  );
  // const suffixElement = (
  //   <Button size="sm" pallet="secondary" onClick={() => formModel.events.myselfClicked()}>
  //     {t('transfer.myselfButton')}
  //   </Button>
  // );

  return (
    <div className="flex flex-col gap-y-2">
      <Input
        wrapperClass="w-full h-10.5"
        label={t('transfer.recipientLabel')}
        placeholder={t('transfer.recipientPlaceholder')}
        invalid={destination.hasError()}
        value={destination.value}
        prefixElement={prefixElement}
        // suffixElement={suffixElement} TODO: isXcmTransfer
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

  const [balance] = useUnit(formModel.$accountBalance);
  const network = useUnit(formModel.$networkStore);

  if (!network) return null;

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
  const {
    fields: { account },
  } = useForm(formModel.$transferForm);

  const api = useUnit(formModel.$api);
  const network = useUnit(formModel.$networkStore);
  const transaction = useUnit(formModel.$transaction);
  const pureTx = useUnit(formModel.$pureTx);
  const isMultisig = useUnit(formModel.$isMultisig);

  const isXcm = useUnit(formModel.$isXcm);
  const xcmConfig = useUnit(formModel.$xcmConfig);
  const xcmApi = useUnit(formModel.$xcmApi);

  if (!network) return null;

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
        transaction={transaction?.wrappedTx}
        onFeeChange={formModel.events.feeChanged}
        onFeeLoading={formModel.events.isFeeLoadingChanged}
      />

      {isXcm && xcmApi && xcmConfig && (
        <XcmFeeWithLabel
          api={xcmApi}
          config={xcmConfig}
          asset={network.asset}
          transaction={pureTx}
          onFeeChange={formModel.events.xcmFeeChanged}
          onFeeLoading={formModel.events.isXcmFeeLoadingChanged}
        />
      )}
    </div>
  );
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
