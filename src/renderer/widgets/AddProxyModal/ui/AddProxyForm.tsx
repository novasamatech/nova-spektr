import { useForm } from 'effector-forms';
import { FormEvent } from 'react';
import { useUnit } from 'effector-react';

import { Button, Select, Input, InputHint, Combobox, Identicon, Alert } from '@shared/ui';
import { useI18n } from '@app/providers';
import { ChainTitle } from '@entities/chain';
import { ProxyPopover, proxyUtils } from '@entities/proxy';
import { AccountAddress, accountUtils } from '@entities/wallet';
import { toAddress, toShortAddress } from '@shared/lib/utils';
import { ProxyDepositWithLabel, MultisigDepositWithLabel, FeeWithLabel } from '@entities/transaction';
import { formModel } from '../model/form-model';
import { AssetBalance } from '@entities/asset';
import { MultisigAccount } from '@shared/core';

type Props = {
  onGoBack: () => void;
};
export const AddProxyForm = ({ onGoBack }: Props) => {
  const { t } = useI18n();

  const { submit } = useForm(formModel.$proxyForm);

  const submitProxy = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <div className="pb-4 px-5">
      <ProxyPopover>{t('manageProxy.addProxy.proxyTooltip')}</ProxyPopover>
      <form id="add-proxy-form" className="flex flex-col gap-y-4 mt-4" onSubmit={submitProxy}>
        <NetworkSelector />
        <AccountSelector />
        <SignatorySelector />
        <ProxyCombobox />
        <ProxyTypeSelector />
        <DescriptionInput />
      </form>
      <div className="flex flex-col gap-y-6 pt-6 pb-4">
        <FeeSection />
        <FeeError />
      </div>
      <ButtonsSection onGoBack={onGoBack} />
    </div>
  );
};

const NetworkSelector = () => {
  const { t } = useI18n();

  const {
    fields: { chain },
  } = useForm(formModel.$proxyForm);

  const proxyChains = useUnit(formModel.$proxyChains);

  const options = Object.values(proxyChains).map((chain) => ({
    id: chain.chainId,
    value: chain,
    element: (
      <ChainTitle
        className="overflow-hidden"
        fontClass="text-text-primary truncate"
        key={chain.chainId}
        chain={chain}
      />
    ),
  }));

  return (
    <div className="flex flex-col gap-y-2">
      <Select
        label="Network"
        placeholder="Select network"
        selectedId={chain.value.chainId}
        invalid={chain.hasError()}
        options={options}
        onChange={({ value }) => chain.onChange(value)}
      />
      <InputHint variant="error" active={chain.hasError()}>
        {t(chain.errorText())}
      </InputHint>
    </div>
  );
};

const AccountSelector = () => {
  const {
    fields: { account, chain },
  } = useForm(formModel.$proxyForm);

  const proxiedAccounts = useUnit(formModel.$proxiedAccounts);

  if (proxiedAccounts.length === 1) return null;

  const options = proxiedAccounts.map(({ account, balance }) => {
    const isShard = accountUtils.isShardAccount(account);
    const address = toAddress(account.accountId, { prefix: chain.value.addressPrefix });

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
          <AssetBalance value={balance} asset={chain.value.assets[0]} />
        </div>
      ),
    };
  });

  return (
    <div className="flex flex-col gap-y-2">
      <Select
        label="Your account"
        placeholder="Select account"
        selectedId={account.value.id.toString()}
        options={options}
        disabled={options.length === 1}
        onChange={({ value }) => account.onChange(value)}
      />
    </div>
  );
};

const SignatorySelector = () => {
  const {
    fields: { chain, account, signatory },
  } = useForm(formModel.$proxyForm);

  const signatories = useUnit(formModel.$signatories);

  if (!accountUtils.isMultisigAccount(account.value)) return null;

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
        label="Signatory"
        placeholder="Select signatory"
        selectedId={signatory.value.id.toString()}
        options={options}
        onChange={({ value }) => signatory.onChange(value)}
      />
    </div>
  );
};

const ProxyCombobox = () => {
  const { t } = useI18n();

  const {
    fields: { delegate, chain },
  } = useForm(formModel.$proxyForm);

  const proxyAccounts = useUnit(formModel.$proxyAccounts);
  const proxyQuery = useUnit(formModel.$proxyQuery);

  const options = proxyAccounts.map((proxyAccount) => {
    const isShard = accountUtils.isShardAccount(proxyAccount);
    const address = toAddress(proxyAccount.accountId, { prefix: chain.value.addressPrefix });

    return {
      id: proxyAccount.id.toString(),
      value: address,
      element: (
        <div className="flex justify-between w-full" key={proxyAccount.id}>
          <AccountAddress
            size={20}
            type="short"
            address={address}
            name={isShard ? toShortAddress(address, 20) : proxyAccount.name}
            canCopy={false}
          />
        </div>
      ),
    };
  });

  return (
    <div className="flex flex-col gap-y-2">
      <Combobox
        label="Give authority to"
        placeholder="Enter address"
        query={proxyQuery}
        options={options}
        value={delegate.value}
        invalid={delegate.hasError()}
        prefixElement={
          <Identicon className="mr-1" address={delegate.value} size={20} background={false} canCopy={false} />
        }
        onInput={formModel.events.proxyQueryChanged}
        onChange={({ value }) => delegate.onChange(value)}
      />
      <InputHint variant="error" active={delegate.hasError()}>
        {t(delegate.errorText())}
      </InputHint>
    </div>
  );
};

const ProxyTypeSelector = () => {
  const { t } = useI18n();

  const {
    fields: { proxyType },
  } = useForm(formModel.$proxyForm);

  const proxyTypes = useUnit(formModel.$proxyTypes);
  const isChainConnected = useUnit(formModel.$isChainConnected);

  const options = proxyTypes.map((type) => ({
    id: type,
    value: type,
    element: t(proxyUtils.getProxyTypeName(type)),
  }));

  return (
    <div className="flex flex-col gap-y-2">
      <Select
        label="Access type"
        placeholder="Choose type"
        selectedId={proxyType.value}
        options={options}
        invalid={proxyType.hasError()}
        disabled={!isChainConnected}
        onChange={({ value }) => proxyType.onChange(value)}
      />
      <InputHint variant="error" active={proxyType.hasError()}>
        {t(proxyType.errorText())}
      </InputHint>
    </div>
  );
};

const DescriptionInput = () => {
  const { t } = useI18n();

  const {
    fields: { account, description },
  } = useForm(formModel.$proxyForm);

  if (!accountUtils.isMultisigAccount(account.value)) return null;

  return (
    <div className="flex flex-col gap-y-2">
      <Input
        spellCheck
        label={t('general.input.descriptionLabel')}
        className="w-full"
        placeholder={t('general.input.descriptionPlaceholder')}
        invalid={description.hasError()}
        value={description.value}
        onChange={description.onChange}
      />
      <InputHint variant="error" active={description.hasError()}>
        {t(description.errorText())}
      </InputHint>
    </div>
  );
};

const FeeSection = () => {
  const {
    fields: { chain, account },
  } = useForm(formModel.$proxyForm);

  const api = useUnit(formModel.$api);
  const fakeTx = useUnit(formModel.$fakeTx);
  const isMultisig = useUnit(formModel.$isMultisig);
  const oldProxyDeposit = useUnit(formModel.$oldProxyDeposit);
  const activeProxies = useUnit(formModel.$activeProxies);

  return (
    <div className="flex flex-col gap-y-2">
      <ProxyDepositWithLabel
        api={api}
        deposit={oldProxyDeposit}
        proxyNumber={activeProxies.length + 1}
        asset={chain.value.assets[0]}
        onDepositChange={formModel.events.proxyDepositChanged}
        onDepositLoading={formModel.events.isProxyDepositLoadingChanged}
      />

      {isMultisig && (
        <MultisigDepositWithLabel
          api={api}
          asset={chain.value.assets[0]}
          threshold={(account.value as MultisigAccount).threshold}
          onDepositChange={formModel.events.multisigDepositChanged}
        />
      )}

      <FeeWithLabel
        api={api}
        asset={chain.value.assets[0]}
        transaction={fakeTx}
        onFeeChange={formModel.events.feeChanged}
        onFeeLoading={formModel.events.isFeeLoadingChanged}
      />
    </div>
  );
};

const FeeError = () => {
  const {
    fields: { account, signatory },
  } = useForm(formModel.$proxyForm);
  const isMultisig = useUnit(formModel.$isMultisig);

  return (
    <Alert title="Not enough tokens" active={account.hasError() || signatory.hasError()} variant="error">
      {isMultisig ? (
        <>
          <Alert.Item active={account.hasError()}>To pay proxy deposit with selected account</Alert.Item>
          <Alert.Item active={signatory.hasError()}>
            To pay multisig deposit and network fee with signatory account
          </Alert.Item>
        </>
      ) : (
        <Alert.Item withDot={false}>To pay proxy deposit and network fee with selected account</Alert.Item>
      )}
    </Alert>
  );
};

const ButtonsSection = ({ onGoBack }: Props) => {
  const canSubmit = useUnit(formModel.$canSubmit);

  return (
    <div className="flex justify-between items-center mt-4">
      <Button variant="text" onClick={onGoBack}>
        Back
      </Button>
      <Button form="add-proxy-form" type="submit" disabled={!canSubmit}>
        Continue
      </Button>
    </div>
  );
};
