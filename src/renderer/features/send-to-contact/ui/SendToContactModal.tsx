import { useUnit } from 'effector-react';

import { networkModel } from '@/entities/network';
import { DefaultTransfer } from '@/widgets/Transfer';
import { sendToContactModel } from '../model/send-to-contact-model';

export const SendToContactModal = () => {
  const contact = useUnit(sendToContactModel.$contact);
  const chains = useUnit(networkModel.$chainsList);

  if (!contact || chains.length === 0) {
    return null;
  }

  return <DefaultTransfer chain={chains[0]} destination={contact.address} />;
};
