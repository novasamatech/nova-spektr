import { InfoSection } from '@renderer/shared/ui/Popovers/InfoPopover/InfoPopover';
import { Address } from '@renderer/domain/shared-kernel';
import { Explorer } from '@renderer/entities/chain';
import { useContact } from '@renderer/entities/contact';
import { useAccount } from '@renderer/entities/account';
import { useMatrix } from '@renderer/app/providers';
import { toAccountId } from '@renderer/shared/lib/utils';
import { ExplorerLink } from '@renderer/components/common';

export const useAddressInfo = (address: Address, explorers?: Explorer[], showMatrix = false): InfoSection[] => {
  const { matrix } = useMatrix();
  const { getLiveContacts } = useContact();
  const { getLiveAccounts } = useAccount();
  const contacts = getLiveContacts();

  const accountFromUser = getLiveAccounts().find((account) => account.accountId === toAccountId(address));
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

  if (explorers && explorers.length > 0) {
    popoverItems.push({
      items: explorers.map((explorer) => ({
        id: explorer.name,
        value: <ExplorerLink explorer={explorer} address={address} />,
      })),
    });
  }

  return popoverItems;
};
