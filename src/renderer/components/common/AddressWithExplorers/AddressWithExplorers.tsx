import AccountAddress, {
  getAddress,
  Props as AccountAddressProps,
} from '@renderer/components/common/AccountAddress/AccountAddress';
import { InfoPopover } from '@renderer/components/ui-redesign';
import { InfoSection } from '@renderer/components/ui-redesign/Popovers/InfoPopover/InfoPopover';
import { Icon } from '@renderer/components/ui';
import { Explorer } from '@renderer/domain/chain';
import { ExplorerLink } from '@renderer/components/common';

type Props = {
  explorers?: Explorer[];
} & AccountAddressProps;

const AddressWithExplorers = ({ explorers, ...addressProps }: Props) => {
  const address = getAddress(addressProps);
  const infoSections: InfoSection[] = [
    { title: 'Address', items: [{ id: address, value: address }] },
    { title: 'Matrix ID', items: [{ id: 'idk', value: '@matrix_handle' }] },
  ];

  const explorerSection: InfoSection | undefined = explorers && {
    items: explorers.map((exolorer) => ({
      id: exolorer.name,
      value: <ExplorerLink explorer={exolorer} address={address} />,
    })),
  };

  const popoverItems = explorerSection ? [...infoSections, explorerSection] : infoSections;

  return (
    <InfoPopover data={popoverItems}>
      <div className="flex items-center gap-x-1 cursor-pointer hover:bg-action-background-hover px-2 py-1 rounded">
        <AccountAddress {...addressProps} />
        <Icon name="info" size={16} className="text-icon-default" />
      </div>
    </InfoPopover>
  );
};

export default AddressWithExplorers;
