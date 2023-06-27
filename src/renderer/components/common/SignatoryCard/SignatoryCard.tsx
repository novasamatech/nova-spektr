import AccountAddress, {
  getAddress,
  Props as AccountAddressProps,
} from '@renderer/components/common/AccountAddress/AccountAddress';
import { InfoPopover } from '@renderer/components/ui-redesign';
import { Icon } from '@renderer/components/ui';
import { Explorer } from '@renderer/domain/chain';
import { SigningStatus } from '@renderer/domain/transaction';
import useAddressInfo from '@renderer/components/common/AccountAddress/useAddressInfo';
import { useAccount } from '@renderer/services/account/accountService';
import { toAddress } from '@renderer/shared/utils/address';

const IconProps = {
  SIGNED: { className: 'group-hover:hidden text-text-positive', name: 'checkLineRedesign' },
  CANCELLED: { className: 'group-hover:hidden text-text-negative', name: 'closeLineRedesign' },
} as const;

type Props = {
  explorers?: Explorer[];
  status?: SigningStatus;
} & AccountAddressProps;

const SignatoryCard = ({
  explorers,
  status,
  addressFont = 'text-body text-inherit',
  size = 20,
  name,
  ...addressProps
}: Props) => {
  const { getLiveAccounts } = useAccount();
  const address = getAddress(addressProps);
  const account = getLiveAccounts().find((a) => toAddress(a.accountId) === address);
  const popoverItems = useAddressInfo(address, explorers, true);

  return (
    <InfoPopover data={popoverItems} buttonClassName="w-full" position="right-0 left-unset">
      <div className="group flex items-center justify-between cursor-pointer hover:bg-action-background-hover hover:text-text-primary text-text-secondary px-2 py-1.5 rounded flex-1">
        <AccountAddress addressFont={addressFont} size={size} name={name || account?.name} {...addressProps} />
        <Icon name="info" size={14} className="text-icon-hover invisible group-hover:visible" />
        {status && status in IconProps && <Icon size={14} {...IconProps[status as keyof typeof IconProps]} />}
      </div>
    </InfoPopover>
  );
};

export default SignatoryCard;
