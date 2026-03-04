import { useUnit } from 'effector-react';

import { nullable } from '@/shared/lib/utils';
import { accountService } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { proxiedChainResource } from '@/entities/proxy';
import { DefaultTransfer } from '@/features/transfer';
import { sendToContactModel } from '../model/send-to-contact-model';

export const SendToContactModal = () => {
  const contact = useUnit(sendToContactModel.$contact);
  const chains = useUnit(networkModel.$chainsList);
  const chainsMap = useUnit(networkModel.$chains);
  const proxyChainCache = useUnit(proxiedChainResource.$cache);

  if (nullable(contact)) {
    return null;
  }

  const compatibleChains = chains.filter((chain) => accountService.isAccountSchemeMatchChain(contact.accountId, chain));

  const proxyChainId = proxyChainCache[contact.accountId];
  const accountChain = proxyChainId ? (chainsMap[proxyChainId] ?? null) : null;

  const defaultChain = accountChain ?? compatibleChains[0];

  if (nullable(defaultChain)) {
    return null;
  }

  return <DefaultTransfer chain={defaultChain} destination={contact.address} xcm={false} />;
};
