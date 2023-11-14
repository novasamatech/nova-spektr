import { FormEvent } from 'react';
import { useForm } from 'effector-forms';

import { constructorModel } from '../model/constructor-model';
import { Button, Input, Checkbox, FootnoteText, Icon, Select } from '@shared/ui';

export const KeyForm = () => {
  const {
    submit,
    isValid,
    fields: { network, keyType, isSharded, shards, keyName, derivationPath },
  } = useForm(constructorModel.$constructorForm);

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <form onSubmit={submitForm}>
      <div className="flex items-end gap-x-6 mb-4">
        <Select
          className="w-[228px]"
          label="Network"
          placeholder="Select"
          options={[]}
          onChange={(value) => network?.onChange('')}
        />
        <Select
          className="w-[256px]"
          label="Type of key"
          placeholder="Select"
          options={[]}
          onChange={(value) => keyType?.onChange('')}
        />
        <div className="flex items-center gap-x-1 py-2">
          <Checkbox checked={isSharded?.value}>
            <FootnoteText className="text-text-secondary">Sharded</FootnoteText>
          </Checkbox>
          <Icon name="info" size={16} />
        </div>
        <Input
          wrapperClass="w-20"
          label="Shards to add"
          placeholder="2 - 50"
          value={shards?.value}
          onChange={shards?.onChange}
        />
      </div>
      <div className="flex items-end gap-x-6">
        <Input
          wrapperClass="w-[228px]"
          label="Key display name"
          placeholder="Choose name"
          value={keyName?.value}
          onChange={keyName?.onChange}
        />
        <Input
          wrapperClass="w-[354px]"
          label="Derivation path"
          placeholder="Derivation path"
          value={derivationPath?.value}
          onChange={derivationPath?.onChange}
        />

        <Button className="my-1" type="submit" pallet="secondary" size="sm" disabled={!isValid}>
          Add new key
        </Button>
      </div>
    </form>
  );
};
