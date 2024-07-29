import { useState } from 'react';

import { useI18n } from '@app/providers';
import { Input, Combobox, Identicon, Icon, IconButton } from '@shared/ui';
import { signatoryModel } from '../../../model/signatory-model';
import { validateAddress } from '@shared/lib/utils';

interface Props {
  index: number;
  canBeDeleted?: boolean;
  onDelete?: (index: number) => void;
}

export const Signatory = ({ index, onDelete, canBeDeleted = true }: Props) => {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [query, setQuery] = useState('');

  const onNameChange = (newName: string) => {
    setName(newName);
    signatoryModel.events.signatoriesChanged({
      index,
      name: newName,
      address,
    });
  };

  const onAddressChange = (newAddress: string) => {
    if (!validateAddress(newAddress)) {
      setAddress('');

      return;
    }

    setAddress(newAddress);
    signatoryModel.events.signatoriesChanged({
      index,
      name,
      address: newAddress,
    });
  };

  // const options = proxyAccounts.map((proxyAccount) => {
  //   const isShard = accountUtils.isShardAccount(proxyAccount);
  //   const address = toAddress(proxyAccount.accountId, { prefix: chain.value.addressPrefix });

  //   return {
  //     id: proxyAccount.id.toString(),
  //     value: address,
  //     element: (
  //       <div className="flex justify-between w-full" key={proxyAccount.id}>
  //         <AccountAddress
  //           size={20}
  //           type="short"
  //           address={address}
  //           name={isShard ? toShortAddress(address, 20) : proxyAccount.name}
  //           canCopy={false}
  //         />
  //       </div>
  //     ),
  //   };
  // });

  const prefixElement = (
    <div className="flex h-auto items-center">
      {!!address && validateAddress(address) ? (
        <Identicon className="mr-1" address={address} size={20} background={false} canCopy={false} />
      ) : (
        <Icon className="mr-2" size={20} name="emptyIdenticon" />
      )}
    </div>
  );

  const accountInputLabel = canBeDeleted
    ? t('createMultisigAccount.signatoryAddress')
    : t('createMultisigAccount.ownAccountSelection');

  return (
    <div className="flex gap-x-2">
      <div className="flex-1">
        <Input
          name={t('createMultisigAccount.signatoryNameLabel')}
          className=""
          wrapperClass="h-[36px]"
          label={t('addressBook.createContact.nameLabel')}
          placeholder={t('addressBook.createContact.namePlaceholder')}
          invalid={false}
          value={name}
          onChange={onNameChange}
        />
      </div>
      <Combobox
        className="flex-1"
        label={accountInputLabel}
        placeholder={t('createMultisigAccount.signatorySelection')}
        options={[]}
        query={query}
        value={address}
        prefixElement={prefixElement}
        onChange={({ value }) => {
          onAddressChange(value);
        }}
        onInput={setQuery}
      />
      {canBeDeleted && onDelete && (
        <IconButton className="mt-4 ml-2" name="delete" size={20} onClick={() => onDelete(index)} />
      )}
    </div>
  );
};
