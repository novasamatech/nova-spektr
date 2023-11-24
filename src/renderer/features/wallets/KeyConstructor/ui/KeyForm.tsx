import { FormEvent, useMemo, useEffect, useRef } from 'react';
import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';

import { constructorModel } from '../model/constructor-model';
import { Button, Input, Checkbox, FootnoteText, Select, InputHint } from '@shared/ui';
import { ShardInfoPopover } from './ShardInfoPopover';
import { ChainTitle } from '@entities/chain';
import { chainsService } from '@entities/network';
import { KeyType } from '@shared/core';

export const KeyForm = () => {
  const networkRef = useRef<HTMLButtonElement>(null);

  const {
    submit,
    isValid,
    fields: { network, keyType, isSharded, shards, keyName, derivationPath },
  } = useForm(constructorModel.$constructorForm);

  const shardedEnabled = useUnit(constructorModel.$shardedEnabled);
  const derivationEnabled = useUnit(constructorModel.$derivationEnabled);

  useEffect(() => {
    if (!networkRef.current) return;

    constructorModel.events.focusableSet(networkRef.current);
  }, []);

  const networks = useMemo(() => {
    return chainsService.getChainsData({ sort: true }).map((chain) => ({
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

  const keyTypes = [
    {
      id: KeyType.HOT,
      value: KeyType.HOT,
      element: <FootnoteText className="text-text-secondary">Hot account</FootnoteText>,
    },
    {
      id: KeyType.PUBLIC,
      value: KeyType.PUBLIC,
      element: <FootnoteText className="text-text-secondary">Public account</FootnoteText>,
    },
    {
      id: KeyType.STAKING,
      value: KeyType.STAKING,
      element: <FootnoteText className="text-text-secondary">Staking account</FootnoteText>,
    },
    {
      id: KeyType.GOVERNANCE,
      value: KeyType.GOVERNANCE,
      element: <FootnoteText className="text-text-secondary">Governance account</FootnoteText>,
    },
    {
      id: KeyType.CUSTOM,
      value: KeyType.CUSTOM,
      element: <FootnoteText className="text-text-secondary">Custom key</FootnoteText>,
    },
  ];

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <form onSubmit={submitForm}>
      <div className="flex items-start gap-x-6 mb-4">
        <Select
          ref={networkRef}
          className="w-[228px]"
          label="Network"
          placeholder="Select network"
          selectedId={network?.value?.chainId}
          options={networks}
          onChange={({ value }) => network?.onChange(value)}
        />
        <div className="flex flex-col gap-y-2">
          <Select
            className="w-[256px]"
            label="Type of key"
            placeholder="Select"
            invalid={keyType?.hasError()}
            selectedId={keyType?.value}
            options={keyTypes}
            onChange={({ value }) => keyType?.onChange(value)}
          />
          <InputHint variant="error" active={keyType?.hasError()}>
            {keyType?.errorText()}
          </InputHint>
        </div>
        <div className="flex items-center gap-x-1 py-2 mt-6.5">
          <Checkbox
            disabled={!shardedEnabled}
            checked={isSharded?.value}
            onChange={({ target }) => isSharded?.onChange(target.checked)}
          >
            <FootnoteText className="text-text-secondary">Sharded</FootnoteText>
          </Checkbox>
          <ShardInfoPopover />
        </div>
        <div className="flex flex-col gap-y-2">
          <Input
            wrapperClass="w-20"
            label="Shards to add"
            placeholder="2 - 50"
            invalid={shards?.hasError()}
            disabled={!shardedEnabled || !isSharded?.value}
            value={shards?.value}
            onChange={shards?.onChange}
          />
          <InputHint variant="error" active={shards?.hasError()}>
            {shards?.errorText()}
          </InputHint>
        </div>
      </div>
      <div className="flex items-start gap-x-6">
        <div className="flex flex-col gap-y-2">
          <Input
            wrapperClass="w-[228px]"
            label="Key display name"
            placeholder="Choose name"
            invalid={keyName?.hasError()}
            value={keyName?.value}
            onChange={keyName?.onChange}
          />
          <InputHint variant="error" active={keyName?.hasError()}>
            {keyName?.errorText()}
          </InputHint>
        </div>
        <div className="flex flex-col gap-y-2">
          <Input
            wrapperClass="w-[354px]"
            label="Derivation path"
            placeholder="Derivation path"
            invalid={derivationPath?.hasError()}
            value={derivationPath?.value}
            disabled={!derivationEnabled}
            onChange={derivationPath?.onChange}
          />
          <InputHint variant="error" active={derivationPath?.hasError()}>
            {derivationPath?.errorText()}
          </InputHint>
        </div>

        <Button className="mb-1 mt-7.5" type="submit" pallet="secondary" size="sm" disabled={!isValid}>
          Add new key
        </Button>
      </div>
    </form>
  );
};
