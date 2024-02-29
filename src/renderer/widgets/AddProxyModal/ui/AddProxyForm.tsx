import { useForm } from 'effector-forms';
import { FormEvent, useEffect } from 'react';
import { useUnit } from 'effector-react';

import { Button, Select, Input, InputHint, Combobox, Identicon } from '@shared/ui';
import { useI18n } from '@app/providers';
import { ChainTitle } from '@entities/chain';
import { ProxyPopover } from '@entities/proxy';
import { AccountAddress, accountUtils, walletUtils } from '@entities/wallet';
import { toAddress, toShortAddress } from '@shared/lib/utils';
import { ProxyDepositWithLabel, MultisigDepositWithLabel, FeeWithLabel } from '@entities/transaction';
import { proxyFormModel, Callbacks } from '../model/proxy-form-model';
import { addProxyUtils } from '../lib/add-proxy-utils';
import { useNetworkData } from '@entities/network';
import { AssetBalance } from '@entities/asset';
import { walletSelectModel } from '@features/wallets';

type Props = Callbacks & {
  onBack: () => void;
};
export const AddProxyForm = ({ onBack, onSubmit }: Props) => {
  const { t } = useI18n();

  const { submit, isValid } = useForm(proxyFormModel.$proxyForm);
  const isChainConnected = useUnit(proxyFormModel.$isChainConnected);
  const isLoading = useUnit(proxyFormModel.$isLoading);

  useEffect(() => {
    proxyFormModel.events.callbacksChanged({ onSubmit });
  }, [onSubmit]);

  const submitProxy = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <div className="pb-4 px-5">
      <ProxyPopover>{t('manageProxy.addProxy.proxyTooltip')}</ProxyPopover>
      <form id="init-proxy-form" className="flex flex-col gap-y-4 mt-4" onSubmit={submitProxy}>
        <NetworkSelector />
        <AccountSelector />
        <SignatorySelector />
        <ProxyCombobox />
        <ProxyTypeSelector />
        <DescriptionInput />
      </form>
      <FeeSection />
      <div className="flex justify-between items-center mt-4">
        <Button variant="text" onClick={onBack}>
          Back
        </Button>
        <Button
          form="init-proxy-form"
          type="submit"
          disabled={!isValid || isLoading || !isChainConnected}
          isLoading={isLoading}
        >
          Continue
        </Button>
      </div>
    </div>
  );
};

const NetworkSelector = () => {
  const { t } = useI18n();

  const {
    fields: { network },
  } = useForm(proxyFormModel.$proxyForm);

  const proxyChains = useUnit(proxyFormModel.$proxyChains);

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
        selectedId={network.value.chainId}
        invalid={network.hasError()}
        options={options}
        onChange={({ value }) => network.onChange(value)}
      />
      <InputHint variant="error" active={network.hasError()}>
        {t(network.errorText())}
      </InputHint>
    </div>
  );
};

const AccountSelector = () => {
  const { t } = useI18n();

  const {
    fields: { account, network },
  } = useForm(proxyFormModel.$proxyForm);

  const wallet = useUnit(walletSelectModel.$walletForDetails);
  const proxiedAccounts = useUnit(proxyFormModel.$proxiedAccounts);

  if (walletUtils.isMultisig(wallet) || proxiedAccounts.length === 0) return null;

  const options = proxiedAccounts.map(({ account, balance }) => {
    const isShard = accountUtils.isShardAccount(account);
    const address = toAddress(account.accountId, { prefix: network.value.addressPrefix });

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
          <AssetBalance value={balance} asset={network.value.assets[0]} />
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
        invalid={account.hasError()}
        disabled={options.length === 1}
        onChange={({ value }) => account.onChange(value)}
      />
      <InputHint variant="error" active={account.hasError()}>
        {t(account.errorText())}
      </InputHint>
    </div>
  );
};

const SignatorySelector = () => {
  const { t } = useI18n();

  const {
    fields: { network, signatory },
  } = useForm(proxyFormModel.$proxyForm);

  const txWrappers = useUnit(proxyFormModel.$txWrappers);
  const signatories = useUnit(proxyFormModel.$signatories);

  if (!addProxyUtils.hasMultisig(txWrappers)) return null;

  const options = signatories.map(({ signer, balance }) => {
    const isShard = accountUtils.isShardAccount(signer);
    const address = toAddress(signer.accountId, { prefix: network.value.addressPrefix });

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
          <AssetBalance value={balance} asset={network.value.assets[0]} />
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
        invalid={signatory.hasError()}
        onChange={({ value }) => signatory.onChange(value)}
      />
      <InputHint variant="error" active={signatory.hasError()}>
        {t(signatory.errorText())}
      </InputHint>
    </div>
  );
};

const ProxyCombobox = () => {
  const { t } = useI18n();

  const {
    fields: { delegate, network },
  } = useForm(proxyFormModel.$proxyForm);

  const proxyAccounts = useUnit(proxyFormModel.$proxyAccounts);
  const proxyQuery = useUnit(proxyFormModel.$proxyQuery);

  const options = proxyAccounts.map((proxyAccount) => {
    const isShard = accountUtils.isShardAccount(proxyAccount);
    const address = toAddress(proxyAccount.accountId, { prefix: network.value.addressPrefix });

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
        onInput={proxyFormModel.events.proxyQueryChanged}
        onChange={({ value }) => delegate.onChange(value)}
      />
      <InputHint variant="error" active={delegate.hasError()}>
        {t(delegate.errorText())}
      </InputHint>
    </div>
  );
};

const ProxyTypeSelector = () => {
  // const { t } = useI18n();

  const {
    fields: { proxyType },
  } = useForm(proxyFormModel.$proxyForm);

  const proxyTypes = useUnit(proxyFormModel.$proxyTypes);
  const isChainConnected = useUnit(proxyFormModel.$isChainConnected);

  const options = proxyTypes.map((type) => ({ id: type, value: type, element: type }));

  return (
    <div className="flex flex-col gap-y-2">
      <Select
        label="Access type"
        placeholder="Choose type"
        selectedId={proxyType.value}
        options={options}
        disabled={!isChainConnected}
        onChange={({ value }) => proxyType.onChange(value)}
      />
    </div>
  );
};

const DescriptionInput = () => {
  const { t } = useI18n();

  const {
    fields: { description },
  } = useForm(proxyFormModel.$proxyForm);

  const txWrappers = useUnit(proxyFormModel.$txWrappers);

  if (!addProxyUtils.hasMultisig(txWrappers)) return null;

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
    fields: { network, account },
  } = useForm(proxyFormModel.$proxyForm);

  const fakeTx = useUnit(proxyFormModel.$fakeTx);
  const txWrappers = useUnit(proxyFormModel.$txWrappers);

  const { api, chain } = useNetworkData(network.value.chainId);

  return (
    <div className="flex flex-col gap-y-2 mt-6">
      <ProxyDepositWithLabel
        api={api}
        asset={chain?.assets[0]}
        onDepositChange={proxyFormModel.events.proxyDepositChanged}
      />

      {addProxyUtils.hasMultisig(txWrappers) && accountUtils.isMultisigAccount(account.value) && (
        <MultisigDepositWithLabel
          api={api}
          asset={chain.assets[0]}
          threshold={account.value.threshold}
          onDepositChange={proxyFormModel.events.multisigDepositChanged}
        />
      )}

      <FeeWithLabel
        api={api}
        asset={chain?.assets[0]}
        transaction={fakeTx}
        onFeeChange={proxyFormModel.events.feeChanged}
      />
    </div>
  );
};
