import { Explorer } from '@renderer/domain/chain';
import { toAddress } from '@renderer/shared/utils/address';
import useAddressInfo from '@renderer/components/common/AccountAddress/useAddressInfo';
import { Icon, Identicon } from '@renderer/components/ui';
import { BodyText, InfoPopover } from '@renderer/components/ui-redesign';
import { HelpText } from '@renderer/components/ui-redesign/Typography';
import { WalletContact } from './AddSignatory';

type WalletsTabItemProps = Pick<WalletContact, 'accountId' | 'walletName' | 'name'> & { explorers?: Explorer[] };

export const WalletsTabItem = ({ accountId, name, walletName, explorers = [] }: WalletsTabItemProps) => {
  const address = toAddress(accountId);
  const popoverItems = useAddressInfo(address, explorers);

  return (
    <>
      <Identicon address={address} size={20} background={false} />
      <div className="flex flex-col">
        <BodyText className="truncate flex items-center">
          {name || address} {walletName && <Icon className="ml-1 text-chip-icon" name="vault" size={14} />}
        </BodyText>
        {walletName && (
          <HelpText className="text-text-tertiary flex items-center">
            <Icon name="curveArrow" className="mr-0.5" size={12} /> {walletName}
          </HelpText>
        )}
      </div>
      <InfoPopover data={popoverItems}>
        <Icon name="info" size={16} className="text-icon-default group-hover:text-icon-hover" />
      </InfoPopover>
    </>
  );
};
