import { Explorer } from '@renderer/entities/chain/model/chain';
import { toAddress } from '@renderer/shared/lib/utils';
import useAddressInfo from '@renderer/entities/account/lib/useAddressInfo';
import { Icon, Identicon, BodyText, InfoPopover, HelpText } from '@renderer/shared/ui';
import { ExtendedWallet } from '../common/types';

type Props = Pick<ExtendedWallet, 'accountId' | 'walletName' | 'name'> & { explorers?: Explorer[] };

export const WalletsTabItem = ({ accountId, name, walletName, explorers = [] }: Props) => {
  const address = toAddress(accountId);
  const popoverItems = useAddressInfo(address, explorers);

  return (
    <div className="flex items-center gap-x-2 w-full">
      <Identicon address={address} size={20} background={false} />

      <div className="flex flex-col max-w-[348px]">
        <BodyText as="span" className=" tracking-tight truncate">
          {name || address}
          {walletName && <Icon className="inline-block ml-1 mb-0.5 text-chip-icon" name="vault" size={14} />}
        </BodyText>

        {walletName && (
          <HelpText className="text-text-tertiary flex items-center">
            <Icon name="curveArrow" className="mr-0.5" size={12} /> {walletName}
          </HelpText>
        )}
      </div>

      <InfoPopover data={popoverItems} containerClassName="ml-auto" position="right-0">
        <Icon name="info" size={16} className="hover:text-icon-hover" />
      </InfoPopover>
    </div>
  );
};
