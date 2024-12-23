import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';
import { type FormEvent } from 'react';

import { type MultisigAccount } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { toAddress, toShortAddress } from '@/shared/lib/utils';
import { Alert, Button, InputHint, Select } from '@/shared/ui';
import { AssetBalance } from '@/entities/asset';
import { ChainTitle } from '@/entities/chain';
import { SignatorySelector } from '@/entities/operations';
import { PureProxyPopover } from '@/entities/proxy';
import { FeeWithLabel, MultisigDepositWithLabel, ProxyDepositWithLabel } from '@/entities/transaction';
import { AccountAddress, accountUtils } from '@/entities/wallet';
import { formModel } from '../model/form-model';

type Props = {
  onGoBack: () => void;
};
export const AddPureProxiedForm = ({ onGoBack }: Props) => {
  const { t } = useI18n();

  const { submit } = useForm(formModel.$proxyForm);

  const submitProxy = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <div className="px-5 pb-4">
      <PureProxyPopover>{t('proxy.pureProxyTooltip.button')}</PureProxyPopover>
      <form id="add-proxy-form" className="mt-4 flex flex-col gap-y-4" onSubmit={submitProxy}>
        <NetworkSelector />
        <AccountSelector />
        <Signatories />
      </form>
      <div className="flex flex-col gap-y-6 pb-4 pt-6">
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
        selectedId={account.value.id.toString()}
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

const FeeSection = () => {
  const {
    fields: { chain, account },
  } = useForm(formModel.$proxyForm);

  const api = useUnit(formModel.$api);
  const fakeTx = useUnit(formModel.$fakeTx);
  const isMultisig = useUnit(formModel.$isMultisig);

  return (
    <div className="flex flex-col gap-y-2">
      <ProxyDepositWithLabel
        api={api}
        proxyNumber={1}
        deposit="0"
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

const ButtonsSection = ({ onGoBack }: Props) => {
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
