import { useForm } from 'effector-forms';
import { FormEvent, useMemo } from 'react';
import { useUnit } from 'effector-react';

import { Button, Select, Input, InputHint, Combobox, FootnoteText } from '@shared/ui';
import { useI18n } from '@app/providers';
import { networkModel } from '@entities/network';
import { ChainTitle } from '@entities/chain';
import { ProxyPopover } from './ProxyPopover';
import { addProxyModel } from '../model/add-proxy-model';

type Props = {
  onBack: () => void;
};
export const InitProxyForm = ({ onBack }: Props) => {
  // const { t } = useI18n();

  const { submit, isValid } = useForm(addProxyModel.$proxyForm);

  const submitProxy = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <div>
      <ProxyPopover />
      <form id="init-proxy-form" className="flex flex-col gap-y-4 mt-4" onSubmit={submitProxy}>
        <NetworkSelector />
        <AccountSelector />
        <SignatorySelector />
        <ProxyInput />
        <ProxyTypeSelector />
        <DescriptionInput />
      </form>
      <div className="flex flex-col gap-y-2 mt-6">
        <div className="flex justify-between items-center">
          <FootnoteText>Proxy Deposit</FootnoteText>
          <FootnoteText>20 DOT</FootnoteText>
        </div>
        <div className="flex justify-between items-center">
          <FootnoteText>Multisig Deposit</FootnoteText>
          <FootnoteText>5 DOT</FootnoteText>
        </div>
        <div className="flex justify-between items-center">
          <FootnoteText>Fee</FootnoteText>
          <FootnoteText>1 DOT</FootnoteText>
        </div>
      </div>
      <div className="flex justify-between items-center mt-4">
        <Button variant="text" onClick={onBack}>
          Back
        </Button>
        <Button form="init-proxy-form" type="submit" disabled={!isValid}>
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
  } = useForm(addProxyModel.$proxyForm);

  const chains = useUnit(networkModel.$chains);

  const networks = useMemo(() => {
    return Object.values(chains).map((chain) => ({
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
  }, []);

  return (
    <div className="flex flex-col gap-y-2">
      <Select
        label="Network"
        placeholder="Select network"
        selectedId={network.value.chainId}
        invalid={network.hasError()}
        options={networks}
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
    fields: { account },
  } = useForm(addProxyModel.$proxyForm);

  return (
    <div className="flex flex-col gap-y-2">
      <Select
        label="Your account"
        placeholder="Select account"
        selectedId={account.value}
        options={[]}
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
  } = useForm(addProxyModel.$proxyForm);

  const isMultisig = useUnit(addProxyModel.$isMultisig);

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

const ProxyInput = () => {
  const { t } = useI18n();

  const {
    fields: { proxyAddress },
  } = useForm(addProxyModel.$proxyForm);

  return (
    <div className="flex flex-col gap-y-2">
      <Combobox
        label="Give authority to"
        placeholder="Enter address"
        options={[]}
        invalid={proxyAddress.hasError()}
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
  } = useForm(addProxyModel.$proxyForm);

  return (
    <div className="flex flex-col gap-y-2">
      <Select
        label="Access type"
        placeholder="Choose type"
        selectedId={proxyType.value}
        options={[]}
        onChange={({ value }) => proxyType.onChange(value)}
      />
    </div>
  );
};

const DescriptionInput = () => {
  const { t } = useI18n();

  const {
    fields: { description },
  } = useForm(addProxyModel.$proxyForm);

  const isMultisig = useUnit(addProxyModel.$isMultisig);

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
