import { useUnit } from 'effector-react';

import { nullable } from '@/shared/lib/utils';
import { accountService } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { DefaultTransfer } from '@/features/transfer';
import { sendToContactModel } from '../model/send-to-contact-model';

export const SendToContactModal = () => {
  const contact = useUnit(sendToContactModel.$contact);
  const chains = useUnit(networkModel.$chainsList);

  if (nullable(contact)) {
    return null;
  }

  const compatibleChains = chains.filter((chain) => accountService.isAccountSchemeMatchChain(contact.accountId, chain));
  const defaultChain = compatibleChains[0];

  if (nullable(defaultChain)) {
    return null;
  }

  return <DefaultTransfer chain={defaultChain} destination={contact.address} />;
};
