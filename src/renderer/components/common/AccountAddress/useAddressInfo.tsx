import { InfoSection } from '@renderer/components/ui-redesign/Popovers/InfoPopover/InfoPopover';
import { Address } from '@renderer/domain/shared-kernel';
import { Explorer } from '@renderer/domain/chain';
import { useContact } from '@renderer/services/contact/contactService';
import { useAccount } from '@renderer/services/account/accountService';
import { useMatrix } from '@renderer/context/MatrixContext';
import { toAddress } from '@renderer/shared/utils/address';
import { ExplorerLink } from '@renderer/components/common';

const useAddressInfo = (address: Address, explorers?: Explorer[]): InfoSection[] => {
  const { matrix } = useMatrix();
  const { getLiveContacts } = useContact();
  const { getLiveAccounts } = useAccount();
  const contacts = getLiveContacts();

  const accountFromUser = getLiveAccounts().find((account) => toAddress(account.accountId) === address);
  const accountFromContact = contacts.find((contact) => contact.address === address);

  const matrixId = accountFromContact?.matrixId || (accountFromUser && matrix.userId);

  const infoSection: InfoSection = { title: 'Address', items: [{ id: address, value: address }] };
  const popoverItems = [infoSection];

  if (matrixId) {
    popoverItems.push({
      title: 'Matrix ID',
      items: [{ id: matrixId, value: matrixId }],
    });
  }

  if (explorers) {
    popoverItems.push({
      items: explorers.map((explorer) => ({
        id: explorer.name,
        value: <ExplorerLink explorer={explorer} address={address} />,
      })),
    });
  }

  return popoverItems;
};

export default useAddressInfo;
