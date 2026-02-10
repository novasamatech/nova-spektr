import { useUnit } from 'effector-react';

import { nullable } from '@/shared/lib/utils';
import { networkModel } from '@/entities/network';
import { DefaultTransfer } from '@/features/transfer';
import { sendToContactModel } from '../model/send-to-contact-model';

export const SendToContactModal = () => {
  const contact = useUnit(sendToContactModel.$contact);
  const chains = useUnit(networkModel.$chainsList);

  const defaultChain = chains[0];
  if (nullable(contact) || nullable(defaultChain)) {
    return null;
  }

  return <DefaultTransfer chain={defaultChain} destination={contact.address} />;
};
