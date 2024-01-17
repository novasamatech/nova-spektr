import { useForm } from 'effector-forms';
import { FormEvent, useMemo } from 'react';
import { useUnit } from 'effector-react';

import { Button, Select, Input, InputHint } from '@shared/ui';
import { addProxyModel } from '../model/add-proxy-model';
import { useI18n } from '@app/providers';
import { networkModel } from '@entities/network';
import { ChainTitle } from '@entities/chain';
import { ProxyPopover } from './ProxyPopover';

type Props = {
  onBack: () => void;
};
export const InitProxyForm = ({ onBack }: Props) => {
  const { t } = useI18n();

  const {
    submit,
    isValid,
    fields: { network, account, signatory, proxyAddress, proxyType, description },
  } = useForm(addProxyModel.$proxyForm);

  const chains = useUnit(networkModel.$chains);

  const submitProxy = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

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

  const proxyTypes = useMemo(() => {
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
    <div>
      <ProxyPopover />
      <form id="init-proxy-form" onSubmit={submitProxy}>
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
        {/* TODO: HIDE address */}
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
        {/* TODO: HIDE signatory */}
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
        <div className="flex flex-col gap-y-2">
          <Input
            label="Give authority to"
            placeholder="Enter address"
            invalid={proxyAddress.hasError()}
            value={proxyAddress.value}
            onChange={proxyAddress.onChange}
          />
          <InputHint variant="error" active={proxyAddress.hasError()}>
            {t(proxyAddress.errorText())}
          </InputHint>
        </div>
        <div className="flex flex-col gap-y-2">
          <Select
            label="Access type"
            placeholder="Choose type"
            selectedId={proxyType.value}
            options={proxyTypes}
            onChange={({ value }) => proxyType.onChange(value)}
          />
        </div>
        {/* TODO: HIDE description */}
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
      </form>
      <div>
        <span>Proxy Deposit</span>
        <span>Multisig Deposit</span>
        <span>Fee</span>
      </div>
      <div>
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
