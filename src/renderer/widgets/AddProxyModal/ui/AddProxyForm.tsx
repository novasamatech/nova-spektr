import { useForm } from 'effector-forms';
import { FormEvent } from 'react';
import { useUnit } from 'effector-react';

import { Button, Select, Input, InputHint, Combobox, FootnoteText, Identicon } from '@shared/ui';
import { useI18n } from '@app/providers';
import { ChainTitle } from '@entities/chain';
import { ProxyPopover } from '@entities/proxy';
import { proxyFormModel } from '../model/proxy-form-model';
import { AccountAddress, accountUtils } from '@entities/wallet';
import { toAddress, toShortAddress } from '@shared/lib/utils';
import { Fee, MultisigDepositWithLabel, ProxyDepositWithLabel } from '@entities/transaction';
import { useNetworkData } from '@entities/network';

type Props = {
  onBack: () => void;
};
export const AddProxyForm = ({ onBack }: Props) => {
  const { t } = useI18n();

  const {
    fields: { network },
    submit,
    isValid,
  } = useForm(proxyFormModel.$proxyForm);
  const isChainConnected = useUnit(proxyFormModel.$isChainConnected);

  const { api, chain } = useNetworkData(network.value.chainId);

  const submitProxy = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <div>
      <ProxyPopover>{t('manageProxy.addProxy.proxyTooltip')}</ProxyPopover>
      <form id="init-proxy-form" className="flex flex-col gap-y-4 mt-4" onSubmit={submitProxy}>
        <NetworkSelector />
        <AccountSelector />
        <SignatorySelector />
        <ProxyCombobox />
        <ProxyTypeSelector />
        <DescriptionInput />
      </form>
      <div className="flex flex-col gap-y-2 mt-6">
        <ProxyDepositWithLabel api={api} asset={chain.assets[0]} />

        <MultisigDepositWithLabel api={api} asset={chain.assets[0]} threshold={1} />

        <div className="flex justify-between items-center">
          <FootnoteText className="text-text-tertiary">Network fee</FootnoteText>
          <FootnoteText className="text-text-tertiary">
            <Fee
              api={api}
              asset={chain.assets[0]}
              // transaction={feeTx}
              // onFeeChange={onFeeChange}
              // onFeeLoading={onFeeLoading}
            />
          </FootnoteText>
        </div>
      </div>
      <div className="flex justify-between items-center mt-4">
        <Button variant="text" onClick={onBack}>
          Back
        </Button>
        <Button form="init-proxy-form" type="submit" disabled={!isValid || !isChainConnected}>
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

  const proxiedAccounts = useUnit(proxyFormModel.$proxiedAccounts);

  if (proxiedAccounts.length === 0) return null;

  const options = proxiedAccounts.map((account) => {
    const isShard = accountUtils.isShardAccount(account);
    const address = toAddress(account.accountId, { prefix: network.value.addressPrefix });

    return {
      id: address,
      value: address,
      element: (
        <div className="flex justify-between w-full" key={account.id}>
          <AccountAddress
            size={20}
            type="short"
            address={address}
            name={isShard ? toShortAddress(address, 20) : account.name}
            canCopy={false}
          />
        </div>
      ),
    };
  });

  return (
    <div className="flex flex-col gap-y-2">
      <Select
        label="Your account"
        placeholder="Select account"
        selectedId={account.value}
        options={options}
        invalid={account.hasError()}
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
    fields: { signatory },
  } = useForm(proxyFormModel.$proxyForm);

  const isMultisig = useUnit(proxyFormModel.$isMultisig);

  if (!isMultisig) return null;

  return (
    <div className="flex flex-col gap-y-2">
      <Select
        label="Signatory"
        placeholder="Select signatory"
        selectedId={signatory.value}
        options={[]}
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
    fields: { proxyAddress, network },
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
        value={proxyAddress.value}
        invalid={proxyAddress.hasError()}
        prefixElement={
          <Identicon className="mr-1" address={proxyAddress.value} size={20} background={false} canCopy={false} />
        }
        onInput={proxyFormModel.events.proxyQueryChanged}
        onChange={({ value }) => proxyAddress.onChange(value)}
      />
      <InputHint variant="error" active={proxyAddress.hasError()}>
        {t(proxyAddress.errorText())}
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

  const isMultisig = useUnit(proxyFormModel.$isMultisig);

  if (!isMultisig) return null;

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
