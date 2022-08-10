import { useState } from 'react';
import { Listbox } from '@headlessui/react';

type Item = {
  value: string;
  label: string;
  disabled?: boolean;
};

type Props = {
  items: Item[];
};

const Select = ({ items }: Props) => {
  const [selectedItem, setSelectedItem] = useState(items[0]);

  return (
    <Listbox value={selectedItem} onChange={setSelectedItem}>
      <Listbox.Button>{selectedItem.label}</Listbox.Button>
      <Listbox.Options>
        {items.map((item) => (
          <Listbox.Option key={item.value} value={item} disabled={item.disabled}>
            {item.label}
          </Listbox.Option>
        ))}
      </Listbox.Options>
    </Listbox>
  );
};

export default Select;
