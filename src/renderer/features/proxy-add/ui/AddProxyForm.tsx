import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';
import { type FormEvent } from 'react';

import { type MultisigAccount } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { toAddress, toShortAddress, validateAddress } from '@/shared/lib/utils';
import { Alert, Button, Combobox, Icon, Identicon, InputHint, Select } from '@/shared/ui';
import { Field } from '@/shared/ui-kit';
import * as networkDomain from '@/domains/network';
import { AssetBalance } from '@/entities/asset';
import { ChainTitle } from '@/entities/chain';
import { SignatorySelector } from '@/entities/operations';
import { ProxyPopover, proxyUtils } from '@/entities/proxy';
import { FeeWithLabel, MultisigDepositWithLabel, ProxyDeposit, ProxyDepositLabel } from '@/entities/transaction';
import { AccountAddress, accountUtils } from '@/entities/wallet';
import { formModel } from '../model/form-model';

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
    <div className="px-5 pb-4">
      <ProxyPopover>{t('proxy.proxyTooltip')}</ProxyPopover>
      <form id="add-proxy-form" className="mt-4 flex flex-col gap-y-4" onSubmit={submitProxy}>
        <NetworkSelector />
        <AccountSelector />
        <Signatories />
        <ProxyInput />
        <ProxyTypeSelector />
      </form>
      <div className="flex flex-col gap-y-6 pb-4 pt-6">
        <FeeSection />
        <FeeError />
      </div>
      <ActionSection onGoBack={onGoBack} />
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
        label={t('proxy.addProxy.networkLabel')}
        placeholder={t('proxy.addProxy.networkPlaceholder')}
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
  const { t } = useI18n();

  const {
    fields: { account, chain },
  } = useForm(formModel.$proxyForm);

  const proxiedAccounts = useUnit(formModel.$proxiedAccounts);

  if (proxiedAccounts.length <= 1) {
    return null;
  }

  const options = proxiedAccounts.map(({ account, balance }) => {
    const isShard = accountUtils.isVaultShardAccount(account);
    const address = toAddress(account.accountId, { prefix: chain.value.addressPrefix });
    const id = networkDomain.accountsService.uniqId(account);

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
          <AssetBalance value={balance} asset={chain.value.assets[0]} />
        </div>
      ),
    };
  });

  return (
    <div className="flex flex-col gap-y-2">
      <Select
        label={t('proxy.addProxy.accountLabel')}
        placeholder={t('proxy.addProxy.accountPlaceholder')}
        selectedId={networkDomain.accountsService.uniqId(account.value)}
        options={options}
        disabled={options.length === 1}
        onChange={({ value }) => account.onChange(value)}
      />
    </div>
  );
};

const Signatories = () => {
  const { t } = useI18n();

  const {
    fields: { chain, signatory },
  } = useForm(formModel.$proxyForm);

  const signatories = useUnit(formModel.$signatories);
  const isMultisig = useUnit(formModel.$isMultisig);

  if (!isMultisig) {
    return null;
  }

  return (
    <SignatorySelector
      signatory={signatory.value}
      signatories={signatories}
      asset={chain.value.assets?.[0]}
      addressPrefix={chain.value.addressPrefix}
      hasError={signatory.hasError()}
      errorText={t(signatory.errorText())}
      onChange={signatory.onChange}
    />
  );
};

const ProxyInput = () => {
  const { t } = useI18n();

  const {
    fields: { delegate, chain },
  } = useForm(formModel.$proxyForm);

  const proxyAccounts = useUnit(formModel.$proxyAccounts);
  const proxyQuery = useUnit(formModel.$proxyQuery);

  const options = proxyAccounts.map((proxyAccount) => {
    const isShard = accountUtils.isVaultShardAccount(proxyAccount);
    const address = toAddress(proxyAccount.accountId, { prefix: chain.value.addressPrefix });
    const id = networkDomain.accountsService.uniqId(proxyAccount);

    return {
      id,
      value: address,
      element: (
        <div className="flex w-full justify-between" key={id}>
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

  const prefixElement = (
    <div className="flex h-auto items-center">
      {validateAddress(delegate.value) ? (
        <Identicon address={delegate.value} size={20} background={false} canCopy={false} />
      ) : (
        <Icon size={20} name="emptyIdenticon" />
      )}
    </div>
  );

  return (
    <Field text={t('proxy.addProxy.delegateLabel')}>
      <Combobox
        placeholder={t('proxy.addProxy.delegatePlaceholder')}
        query={proxyQuery}
        options={options}
        value={delegate.value}
        invalid={delegate.hasError()}
        prefixElement={prefixElement}
        onInput={formModel.events.proxyQueryChanged}
        onChange={({ value }) => delegate.onChange(value)}
      />
      <InputHint variant="error" active={delegate.hasError()}>
        {t(delegate.errorText())}
      </InputHint>
    </Field>
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
        label={t('proxy.addProxy.proxyTypeLabel')}
        placeholder={t('proxy.addProxy.proxyTypePlaceholder')}
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
      <ProxyDepositLabel>
        <ProxyDeposit
          api={api}
          deposit={oldProxyDeposit}
          proxyNumber={activeProxies.length + 1}
          asset={chain.value.assets?.[0]}
          onDepositChange={formModel.events.proxyDepositChanged}
          onDepositLoading={formModel.events.isProxyDepositLoadingChanged}
        />
      </ProxyDepositLabel>

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
  const { t } = useI18n();

  const {
    fields: { account },
  } = useForm(formModel.$proxyForm);

  const isMultisig = useUnit(formModel.$isMultisig);

  return (
    <Alert title={t('proxy.addProxy.balanceAlertTitle')} active={account.hasError()} variant="error">
      <Alert.Item withDot={false}>
        {isMultisig ? t('proxy.addProxy.balanceAlertMultisig') : t('proxy.addProxy.balanceAlertRegular')}
      </Alert.Item>
    </Alert>
  );
};

const ActionSection = ({ onGoBack }: Props) => {
  const { t } = useI18n();

  const canSubmit = useUnit(formModel.$canSubmit);

  return (
    <div className="mt-4 flex items-center justify-between">
      <Button variant="text" onClick={onGoBack}>
        {t('operation.goBackButton')}
      </Button>
      <Button form="add-proxy-form" type="submit" disabled={!canSubmit}>
        {t('operation.continueButton')}
      </Button>
    </div>
  );
};
