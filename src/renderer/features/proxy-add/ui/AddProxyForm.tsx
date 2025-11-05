import { useUnit } from 'effector-react';
import { type FormEvent, useMemo } from 'react';

import { TEST_IDS } from '@/shared/constants';
import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { getNativeAsset, toAddress, toShortAddress, transferableAmount, withdrawableAmount } from '@/shared/lib/utils';
import { Alert, Button, Combobox, InputHint, Select } from '@/shared/ui';
import { AssetBalance, Identicon, SignatorySelect, TransactionValidationError } from '@/shared/ui-entities';
import { Field } from '@/shared/ui-kit';
import { accountService, accounts } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { ChainTitle } from '@/entities/chain';
import { ProxyPopover, proxyUtils } from '@/entities/proxy';
import { FeeWithLabel, MultisigDepositFee, ProxyDeposit, ProxyDepositLabel } from '@/entities/transaction';
import { AccountAddress, accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { formModel } from '../model/form-model';

export const AddProxyForm = () => {
  const { t } = useI18n();

  const { submit } = useForm(formModel.form);
  const errors = useUnit(formModel.$errors);
  const wallets = useUnit(walletModel.$wallets);

  const submitProxy = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <div className="px-5 pb-4">
      <TransactionValidationError errors={errors} wallets={wallets} />
      <ProxyPopover>{t('proxy.proxyTooltip')}</ProxyPopover>
      <form id="add-proxy-form" className="mt-4 flex flex-col gap-y-4" onSubmit={submitProxy}>
        <NetworkSelector />
        <AccountSelector />
        <Signatories />
        <ProxyInput />
        <ProxyTypeSelector />
      </form>
      <div className="flex flex-col gap-y-6 pt-6 pb-4">
        <FeeSection />
        <FeeError />
      </div>
      <ActionSection />
    </div>
  );
};

const NetworkSelector = () => {
  const { t } = useI18n();

  const {
    fields: { chain },
  } = useForm(formModel.form);

  const availableChains = useUnit(formModel.$availableChains);

  const options = useMemo(
    () =>
      Object.values(availableChains).map((chain) => ({
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
      })),
    [availableChains],
  );

  if (!chain.value) {
    return null;
  }

  return (
    <div className="flex flex-col gap-y-2">
      <Select
        label={t('proxy.addProxy.networkLabel')}
        placeholder={t('proxy.addProxy.networkPlaceholder')}
        selectedId={chain.value.chainId}
        invalid={chain.hasError}
        options={options}
        onChange={({ value }) => chain.onChange(value)}
      />
      <InputHint variant="error" active={chain.hasError}>
        {t(chain.errorMessage)}
      </InputHint>
    </div>
  );
};

const AccountSelector = () => {
  const { t } = useI18n();

  const {
    fields: { initiator },
  } = useForm(formModel.form);

  const chain = useUnit(formModel.form.fields.chain.$value);
  const availableAccounts = useUnit(formModel.$availableAccounts);
  const wallet = useUnit(walletSelect.$selectedWallet);
  const balances = useUnit(balanceModel.$balanceMap);

  if (availableAccounts.length < 2 || walletUtils.isFlexibleMultisig(wallet) || !initiator.value || !chain) {
    return null;
  }

  const nativeAsset = getNativeAsset(chain.assets);

  const options = availableAccounts.map((account) => {
    const isShard = accountUtils.isVaultShardAccount(account);
    const address = toAddress(account.accountId, { prefix: chain.addressPrefix });
    const id = accountService.uniqId(account);

    const balance = balanceUtils.getBalance(
      balances,
      account.accountId,
      chain.chainId,
      getNativeAsset(chain.assets).assetId,
    );

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
          <AssetBalance value={transferableAmount(balance)} asset={nativeAsset} />
        </div>
      ),
    };
  });

  return (
    <div className="flex flex-col gap-y-2">
      <Select
        label={t('proxy.addProxy.accountLabel')}
        placeholder={t('proxy.addProxy.accountPlaceholder')}
        selectedId={accountService.uniqId(initiator.value)}
        options={options}
        disabled={options.length === 1}
        onChange={({ value }) => initiator.onChange(value)}
      />
    </div>
  );
};

const Signatories = () => {
  const { t } = useI18n();

  const {
    fields: { chain, signatory, initiator },
  } = useForm(formModel.form);

  const signatories = useUnit(formModel.$signatories);
  const isMultisig = useUnit(formModel.$isMultisig);

  const allAccounts = useUnit(accounts.$list);
  const allWallets = useUnit(walletModel.$wallets);
  const balances = useUnit(balanceModel.$balanceMap);

  if (!chain.value) return null;

  const nativeAsset = getNativeAsset(chain.value.assets);

  const signatoriesWithBalance = useMemo(() => {
    return signatories.map((signatory) => {
      const balance = balanceUtils.getBalance(balances, signatory.accountId, chain.value!.chainId, nativeAsset.assetId);
      return { account: signatory, balance: withdrawableAmount(balance) };
    });
  }, [signatories, balances]);

  if (!isMultisig) {
    return null;
  }

  return (
    <SignatorySelect
      signatory={signatory.value}
      signatories={signatoriesWithBalance}
      allAccounts={allAccounts}
      initiator={initiator.value}
      allWallets={allWallets}
      hasError={signatory.hasError}
      errorText={t(signatory.errorMessage)}
      network={{ chain: chain.value, asset: nativeAsset }}
      onChange={signatory.onChange}
    />
  );
};

const ProxyInput = () => {
  const { t } = useI18n();

  const {
    fields: { delegate, chain },
  } = useForm(formModel.form);

  const proxyAccounts = useUnit(formModel.$proxyAccounts);
  const proxyQuery = useUnit(formModel.$proxyQuery);

  if (!chain.value) return null;

  const options = proxyAccounts.map((proxyAccount) => {
    const isShard = accountUtils.isVaultShardAccount(proxyAccount);
    const address = toAddress(proxyAccount.accountId, { prefix: chain.value!.addressPrefix });
    const id = accountService.uniqId(proxyAccount);

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
      <Identicon address={toAddress(delegate.value)} size={20} background={false} canCopy={false} />
    </div>
  );

  return (
    <Field text={t('proxy.addProxy.delegateLabel')}>
      <Combobox
        placeholder={t('proxy.addProxy.delegatePlaceholder')}
        query={proxyQuery}
        testId={TEST_IDS.PROXY_FORM.ADDRESS_INPUT}
        options={options}
        value={delegate.value}
        invalid={delegate.hasError}
        prefixElement={prefixElement}
        onInput={formModel.proxyQueryChanged}
        onChange={({ value }) => delegate.onChange(value)}
      />
      <InputHint variant="error" active={delegate.hasError}>
        {t(delegate.errorMessage)}
      </InputHint>
    </Field>
  );
};

const ProxyTypeSelector = () => {
  const { t } = useI18n();

  const {
    fields: { proxyType },
  } = useForm(formModel.form);

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
        invalid={proxyType.hasError}
        disabled={!isChainConnected}
        onChange={({ value }) => proxyType.onChange(value)}
      />
      <InputHint variant="error" active={proxyType.hasError}>
        {t(proxyType.errorMessage)}
      </InputHint>
    </div>
  );
};

const FeeSection = () => {
  const {
    fields: { chain },
  } = useForm(formModel.form);

  const api = useUnit(formModel.$api);
  const fee = useUnit(formModel.$fee);
  const pendingFee = useUnit(formModel.$pendingFee);
  const isMultisig = useUnit(formModel.$isMultisig);
  const multisigDeposit = useUnit(formModel.$multisigDeposit);
  const oldProxyDeposit = useUnit(formModel.$oldProxyDeposit);
  const activeProxies = useUnit(formModel.$activeProxies);

  if (!chain.value) return null;

  const nativeAsset = getNativeAsset(chain.value.assets);

  return (
    <div className="flex flex-col gap-y-2">
      <ProxyDepositLabel>
        <ProxyDeposit
          api={api}
          deposit={oldProxyDeposit}
          proxyNumber={activeProxies.length + 1}
          asset={nativeAsset}
          onDepositChange={formModel.proxyDepositChanged}
          onDepositLoading={formModel.isProxyDepositLoadingChanged}
        />
      </ProxyDepositLabel>

      {isMultisig && <MultisigDepositFee asset={nativeAsset} multisigDeposit={multisigDeposit.toString()} />}

      <FeeWithLabel asset={nativeAsset} fee={fee} isLoading={pendingFee} />
    </div>
  );
};

const FeeError = () => {
  const { t } = useI18n();

  const {
    fields: { initiator },
  } = useForm(formModel.form);

  const isMultisig = useUnit(formModel.$isMultisig);

  return (
    <Alert title={t('proxy.addProxy.balanceAlertTitle')} active={initiator.hasError} variant="error">
      <Alert.Item withDot={false}>
        {isMultisig ? t('proxy.addProxy.balanceAlertMultisig') : t('proxy.addProxy.balanceAlertRegular')}
      </Alert.Item>
    </Alert>
  );
};

const ActionSection = () => {
  const { t } = useI18n();

  const canSubmit = useUnit(formModel.$canSubmit);

  return (
    <div className="mt-4 flex items-center justify-end">
      <Button form="add-proxy-form" type="submit" disabled={!canSubmit}>
        {t('operation.continueButton')}
      </Button>
    </div>
  );
};
