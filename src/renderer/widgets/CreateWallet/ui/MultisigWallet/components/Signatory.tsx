import { useState } from 'react';
import { validateAddress } from '@polkadot/util-crypto';

import { useI18n } from '@app/providers';
import { Input, Combobox, Identicon, Icon } from '@shared/ui';
import { signatoryModel } from '../../../model/signatory-model';

interface Props {
  index: number;
}

export const Signatory = ({ index }: Props) => {
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
    try {
      validateAddress(newAddress);
      setAddress(newAddress);
      signatoryModel.events.signatoriesChanged({
        index,
        name,
        address: newAddress,
      });
    } catch {
      // do nothing wrong address
      setAddress('');
    }
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

  return (
    <div className="flex">
      <Input
        name="Signatory name"
        className=""
        wrapperClass="h-[42px]"
        label={t('addressBook.createContact.nameLabel')}
        placeholder={t('addressBook.createContact.namePlaceholder')}
        invalid={false}
        value={name}
        onChange={onNameChange}
      />
      <Combobox
        label="Signatory address"
        placeholder="Choose or paste an address"
        options={[]}
        query={query}
        value={address}
        prefixElement={prefixElement}
        onChange={({ value }) => {
          onAddressChange(value);
        }}
        onInput={setQuery}
      />
    </div>
  );
};
