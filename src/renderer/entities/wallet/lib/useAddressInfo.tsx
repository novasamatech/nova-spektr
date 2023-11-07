import { useUnit } from 'effector-react';

import { InfoSection } from '@renderer/shared/ui/Popovers/InfoPopover/InfoPopover';
import type { Address, Explorer } from '@renderer/shared/core';
import { useMatrix } from '@renderer/app/providers';
import { getAccountExplorer, toAccountId } from '@renderer/shared/lib/utils';
import { contactModel } from '../../contact/model/contact-model';
import { walletModel } from '../model/wallet-model';
import { ExplorerLink } from '@renderer/shared/ui';

type InfoProps = {
  address: Address;
  explorers?: Explorer[];
  addressPrefix?: number;
  showMatrix?: boolean;
};
export const useAddressInfo = ({ address, explorers = [], addressPrefix, showMatrix }: InfoProps): InfoSection[] => {
  const { matrix } = useMatrix();
  const contacts = useUnit(contactModel.$contacts);
  const accounts = useUnit(walletModel.$accounts);

  const accountFromUser = accounts.find((account) => account.accountId === toAccountId(address));
  const accountFromContact = contacts.find((contact) => toAccountId(contact.address) === toAccountId(address));

  const matrixId = accountFromContact?.matrixId || (accountFromUser && matrix.userId);

  const infoSection: InfoSection = { title: 'Address', items: [{ id: address, value: address }] };
  const popoverItems = [infoSection];

  if (showMatrix && matrixId) {
    popoverItems.push({
      title: 'Matrix ID',
      items: [{ id: matrixId, value: matrixId }],
    });
  }

  if (explorers.length > 0) {
    popoverItems.push({
      items: explorers.map((explorer) => ({
        id: explorer.name,
        value: <ExplorerLink name={explorer.name} href={getAccountExplorer(explorer, address, addressPrefix)} />,
      })),
    });
  }

  return popoverItems;
};
